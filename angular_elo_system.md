import { Injectable } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

export interface EloMatchInput {
  a1: string;
  a2: string;
  b1: string;
  b2: string;
  sets_a: number;
  sets_b: number;
}

@Injectable({
  providedIn: 'root'
})
export class EloRatingService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  /**
   * Submits a match result and calculates ELO updates atomically via Supabase RPC.
   */
  async submitMatchResultElo(input: EloMatchInput): Promise<string> {
    const { data, error } = await this.supabase.rpc('submit_match_result_elo', input);

    if (error) {
      console.error('Error submitting match result:', error);
      throw new Error(error.message);
    }

    return data;
  }
}

// Example Component
import { Component } from '@angular/core';

@Component({
  selector: 'app-post-match',
  template: `
    <div *ngIf="loading">Calculando resultados...</div>
    <div *ngIf="!loading && result">
      <h2>¡Resultado Confirmado!</h2>
      <p>Tu rating ha sido actualizado.</p>
      
      <div class="rating-card">
        <div class="before">
          <p>Antes</p>
          <h3>{{ result.oldRating | number:'1.2-2' }}</h3>
        </div>
        <div class="delta" [ngClass]="{'positive': result.delta > 0, 'negative': result.delta <= 0}">
          {{ result.delta > 0 ? '+' : '' }}{{ result.delta | number:'1.2-2' }}
        </div>
        <div class="after">
          <p>Ahora</p>
          <h3>{{ result.newRating | number:'1.2-2' }}</h3>
        </div>
      </div>

      <div class="info-box">
        <h4>¿Cómo se calcula?</h4>
        <p>El sistema estima quién era favorito según el rating de los equipos. Si ganás siendo underdog sumás más; si perdés siendo favorito restás más. Los sets suman un extra pequeño (0,01 por set). En tus primeros partidos el rating se ajusta más rápido.</p>
      </div>

      <button (click)="onContinue()">Continuar</button>
    </div>
  `,
  styles: [`
    .rating-card { display: flex; justify-content: space-around; align-items: center; padding: 20px; border: 1px solid #ccc; border-radius: 8px; margin-bottom: 20px; }
    .positive { color: green; font-weight: bold; }
    .negative { color: red; font-weight: bold; }
    .info-box { background: #f9f9f9; padding: 15px; border-radius: 8px; font-size: 0.9em; }
  `]
})
export class PostMatchComponent {
  loading = false;
  result: { oldRating: number, newRating: number, delta: number } | null = null;

  constructor(private eloService: EloRatingService) {}

  async submitResult(matchInput: EloMatchInput) {
    this.loading = true;
    try {
      // Assuming we get the new rating from a subsequent fetch or the RPC returns it
      const matchId = await this.eloService.submitMatchResultElo(matchInput);
      
      // Fetch updated user rating here (mocked for example)
      this.result = {
        oldRating: 3.50,
        newRating: 3.62,
        delta: 0.12
      };
    } catch (error) {
      alert('Error al confirmar resultado');
    } finally {
      this.loading = false;
    }
  }

  onContinue() {
    this.result = null;
    // Navigate away
  }
}
