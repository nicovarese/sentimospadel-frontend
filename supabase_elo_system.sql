-- Supabase ELO System Implementation

-- 1. Tables
CREATE TABLE IF NOT EXISTS public.player_ratings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    current_rating NUMERIC(4,2) NOT NULL DEFAULT 3.50,
    rated_matches_played INT NOT NULL DEFAULT 0,
    current_category_number INT,
    current_category_name TEXT,
    last_updated TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    sets_a INT NOT NULL,
    sets_b INT NOT NULL,
    p_a NUMERIC(5,4) NOT NULL,
    k_factor NUMERIC(4,2) NOT NULL,
    delta_team_a NUMERIC(5,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.match_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    team TEXT NOT NULL CHECK (team IN ('A', 'B')),
    old_rating NUMERIC(4,2) NOT NULL,
    new_rating NUMERIC(4,2) NOT NULL,
    delta NUMERIC(5,2) NOT NULL,
    matches_played_before INT NOT NULL
);

-- 2. RLS Policies
ALTER TABLE public.player_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;

-- player_ratings: anyone can read, only owner can update (though updates should be via RPC)
CREATE POLICY "Anyone can read player ratings" ON public.player_ratings FOR SELECT USING (true);
CREATE POLICY "Owner can update their rating" ON public.player_ratings FOR UPDATE USING (auth.uid() = user_id);

-- matches & match_participants: participants can read
CREATE POLICY "Participants can read matches" ON public.matches FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.match_participants WHERE match_id = matches.id AND user_id = auth.uid())
);
CREATE POLICY "Participants can read match participants" ON public.match_participants FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.match_participants mp WHERE mp.match_id = match_participants.match_id AND mp.user_id = auth.uid())
);

-- 3. Helper Function for Category
CREATE OR REPLACE FUNCTION public.get_uruguay_category(rating NUMERIC)
RETURNS TABLE (category_number INT, category_name TEXT) AS $$
BEGIN
    IF rating >= 6.40 THEN RETURN QUERY SELECT 1, 'Primera';
    ELSIF rating >= 5.50 THEN RETURN QUERY SELECT 2, 'Segunda';
    ELSIF rating >= 4.80 THEN RETURN QUERY SELECT 3, 'Tercera';
    ELSIF rating >= 4.10 THEN RETURN QUERY SELECT 4, 'Cuarta';
    ELSIF rating >= 3.40 THEN RETURN QUERY SELECT 5, 'Quinta';
    ELSIF rating >= 2.60 THEN RETURN QUERY SELECT 6, 'Sexta';
    ELSE RETURN QUERY SELECT 7, 'Séptima';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Main RPC for ELO Calculation
CREATE OR REPLACE FUNCTION public.submit_match_result_elo(
    a1 UUID, a2 UUID, b1 UUID, b2 UUID,
    sets_a INT, sets_b INT
) RETURNS UUID AS $$
DECLARE
    caller UUID := auth.uid();
    rA1 NUMERIC; rA2 NUMERIC; rB1 NUMERIC; rB2 NUMERIC;
    nA1 INT; nA2 INT; nB1 INT; nB2 INT;
    RA NUMERIC; RB NUMERIC; D NUMERIC;
    PA NUMERIC; SA INT;
    nTeamA INT; nTeamB INT;
    KTeamA NUMERIC; KTeamB NUMERIC; K NUMERIC;
    deltaBaseA NUMERIC; deltaSetsA NUMERIC;
    deltaTeamA_raw NUMERIC; deltaTeamA NUMERIC;
    capTeamA NUMERIC; capTeamB NUMERIC; deltaTeamB NUMERIC;
    shareA1 NUMERIC; shareA2 NUMERIC; shareB1 NUMERIC; shareB2 NUMERIC;
    deltaA1_raw NUMERIC; deltaA2_raw NUMERIC; deltaB1_raw NUMERIC; deltaB2_raw NUMERIC;
    deltaA1 NUMERIC; deltaA2 NUMERIC; deltaB1 NUMERIC; deltaB2 NUMERIC;
    new_match_id UUID;
    
    -- Helper for player cap
    cap_player NUMERIC;
BEGIN
    -- 1) Validate caller is a participant
    IF caller NOT IN (a1, a2, b1, b2) THEN
        RAISE EXCEPTION 'Caller must be a participant in the match';
    END IF;

    -- 2) Lock rows FOR UPDATE to prevent race conditions
    -- Ensure all players exist and get their current stats
    SELECT current_rating, rated_matches_played INTO rA1, nA1 FROM public.player_ratings WHERE user_id = a1 FOR UPDATE;
    SELECT current_rating, rated_matches_played INTO rA2, nA2 FROM public.player_ratings WHERE user_id = a2 FOR UPDATE;
    SELECT current_rating, rated_matches_played INTO rB1, nB1 FROM public.player_ratings WHERE user_id = b1 FOR UPDATE;
    SELECT current_rating, rated_matches_played INTO rB2, nB2 FROM public.player_ratings WHERE user_id = b2 FOR UPDATE;

    IF rA1 IS NULL OR rA2 IS NULL OR rB1 IS NULL OR rB2 IS NULL THEN
        RAISE EXCEPTION 'One or more players not found in player_ratings';
    END IF;

    -- 3) Calculate ELO
    RA := (rA1 + rA2) / 2.0;
    RB := (rB1 + rB2) / 2.0;
    D := RA - RB;

    PA := 1.0 / (1.0 + exp(-D / 0.55));
    SA := CASE WHEN sets_a > sets_b THEN 1 ELSE 0 END;

    nTeamA := round((nA1 + nA2) / 2.0);
    nTeamB := round((nB1 + nB2) / 2.0);

    KTeamA := CASE WHEN nTeamA <= 10 THEN 0.28 WHEN nTeamA <= 25 THEN 0.22 WHEN nTeamA <= 60 THEN 0.12 ELSE 0.10 END;
    KTeamB := CASE WHEN nTeamB <= 10 THEN 0.28 WHEN nTeamB <= 25 THEN 0.22 WHEN nTeamB <= 60 THEN 0.12 ELSE 0.10 END;
    K := (KTeamA + KTeamB) / 2.0;

    deltaBaseA := K * (SA - PA);
    
    deltaSetsA := 0.01 * GREATEST(-2, LEAST(2, LEAST(sets_a, 2) - LEAST(sets_b, 2)));
    
    deltaTeamA_raw := deltaBaseA + deltaSetsA;
    
    capTeamA := CASE WHEN nTeamA BETWEEN 26 AND 60 THEN 0.06 ELSE 0.30 END;
    deltaTeamA := GREATEST(-capTeamA, LEAST(capTeamA, deltaTeamA_raw));
    deltaTeamB := -deltaTeamA;

    shareA1 := rA1 / (rA1 + rA2);
    shareA2 := rA2 / (rA1 + rA2);
    deltaA1_raw := deltaTeamA * shareA1;
    deltaA2_raw := deltaTeamA * shareA2;

    shareB1 := rB1 / (rB1 + rB2);
    shareB2 := rB2 / (rB1 + rB2);
    deltaB1_raw := deltaTeamB * shareB1;
    deltaB2_raw := deltaTeamB * shareB2;

    -- Apply player caps
    deltaA1 := GREATEST(CASE WHEN nA1 <= 10 THEN -0.18 ELSE -0.30 END, LEAST(CASE WHEN nA1 <= 10 THEN 0.18 ELSE 0.30 END, deltaA1_raw));
    deltaA2 := GREATEST(CASE WHEN nA2 <= 10 THEN -0.18 ELSE -0.30 END, LEAST(CASE WHEN nA2 <= 10 THEN 0.18 ELSE 0.30 END, deltaA2_raw));
    deltaB1 := GREATEST(CASE WHEN nB1 <= 10 THEN -0.18 ELSE -0.30 END, LEAST(CASE WHEN nB1 <= 10 THEN 0.18 ELSE 0.30 END, deltaB1_raw));
    deltaB2 := GREATEST(CASE WHEN nB2 <= 10 THEN -0.18 ELSE -0.30 END, LEAST(CASE WHEN nB2 <= 10 THEN 0.18 ELSE 0.30 END, deltaB2_raw));

    -- 4) Insert Match & Participants
    INSERT INTO public.matches (sets_a, sets_b, p_a, k_factor, delta_team_a)
    VALUES (sets_a, sets_b, PA, K, deltaTeamA)
    RETURNING id INTO new_match_id;

    INSERT INTO public.match_participants (match_id, user_id, team, old_rating, new_rating, delta, matches_played_before)
    VALUES 
        (new_match_id, a1, 'A', rA1, GREATEST(1.00, LEAST(7.00, rA1 + deltaA1)), deltaA1, nA1),
        (new_match_id, a2, 'A', rA2, GREATEST(1.00, LEAST(7.00, rA2 + deltaA2)), deltaA2, nA2),
        (new_match_id, b1, 'B', rB1, GREATEST(1.00, LEAST(7.00, rB1 + deltaB1)), deltaB1, nB1),
        (new_match_id, b2, 'B', rB2, GREATEST(1.00, LEAST(7.00, rB2 + deltaB2)), deltaB2, nB2);

    -- 5) Update Player Ratings
    UPDATE public.player_ratings SET 
        current_rating = round(GREATEST(1.00, LEAST(7.00, current_rating + deltaA1)), 2),
        rated_matches_played = rated_matches_played + 1,
        current_category_number = (SELECT category_number FROM public.get_uruguay_category(GREATEST(1.00, LEAST(7.00, current_rating + deltaA1)))),
        current_category_name = (SELECT category_name FROM public.get_uruguay_category(GREATEST(1.00, LEAST(7.00, current_rating + deltaA1)))),
        last_updated = now()
    WHERE user_id = a1;

    UPDATE public.player_ratings SET 
        current_rating = round(GREATEST(1.00, LEAST(7.00, current_rating + deltaA2)), 2),
        rated_matches_played = rated_matches_played + 1,
        current_category_number = (SELECT category_number FROM public.get_uruguay_category(GREATEST(1.00, LEAST(7.00, current_rating + deltaA2)))),
        current_category_name = (SELECT category_name FROM public.get_uruguay_category(GREATEST(1.00, LEAST(7.00, current_rating + deltaA2)))),
        last_updated = now()
    WHERE user_id = a2;

    UPDATE public.player_ratings SET 
        current_rating = round(GREATEST(1.00, LEAST(7.00, current_rating + deltaB1)), 2),
        rated_matches_played = rated_matches_played + 1,
        current_category_number = (SELECT category_number FROM public.get_uruguay_category(GREATEST(1.00, LEAST(7.00, current_rating + deltaB1)))),
        current_category_name = (SELECT category_name FROM public.get_uruguay_category(GREATEST(1.00, LEAST(7.00, current_rating + deltaB1)))),
        last_updated = now()
    WHERE user_id = b1;

    UPDATE public.player_ratings SET 
        current_rating = round(GREATEST(1.00, LEAST(7.00, current_rating + deltaB2)), 2),
        rated_matches_played = rated_matches_played + 1,
        current_category_number = (SELECT category_number FROM public.get_uruguay_category(GREATEST(1.00, LEAST(7.00, current_rating + deltaB2)))),
        current_category_name = (SELECT category_name FROM public.get_uruguay_category(GREATEST(1.00, LEAST(7.00, current_rating + deltaB2)))),
        last_updated = now()
    WHERE user_id = b2;

    RETURN new_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
