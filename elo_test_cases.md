# ELO System Test Cases

## 1. Underdog gana 2-1 con n <= 10
- **Team A (Underdog)**: A1 (Rating: 3.00, n: 5), A2 (Rating: 3.20, n: 5) -> RA = 3.10, nTeamA = 5
- **Team B (Favorito)**: B1 (Rating: 4.00, n: 20), B2 (Rating: 4.20, n: 20) -> RB = 4.10, nTeamB = 20
- **Sets**: A gana 2-1
- **Cálculo**:
  - D = 3.10 - 4.10 = -1.00
  - PA = 1 / (1 + exp(1.00 / 0.55)) = 1 / (1 + 6.16) = 0.14
  - SA = 1
  - KTeamA = 0.28, KTeamB = 0.22 -> K = 0.25
  - deltaBaseA = 0.25 * (1 - 0.14) = 0.215
  - deltaSetsA = 0.01 * (2 - 1) = 0.01
  - deltaTeamA_raw = 0.215 + 0.01 = 0.225
  - capTeamA = 0.30 (nTeamA=5) -> deltaTeamA = 0.225
  - deltaTeamB = -0.225
  - **Reparto A**: shareA1 = 3.00/6.20 = 0.484, shareA2 = 3.20/6.20 = 0.516
    - deltaA1_raw = 0.225 * 0.484 = 0.109 -> capPlayer(5)=0.18 -> deltaA1 = 0.11
    - deltaA2_raw = 0.225 * 0.516 = 0.116 -> capPlayer(5)=0.18 -> deltaA2 = 0.12
  - **Reparto B**: shareB1 = 4.00/8.20 = 0.488, shareB2 = 4.20/8.20 = 0.512
    - deltaB1_raw = -0.225 * 0.488 = -0.110 -> capPlayer(20)=0.30 -> deltaB1 = -0.11
    - deltaB2_raw = -0.225 * 0.512 = -0.115 -> capPlayer(20)=0.30 -> deltaB2 = -0.12

## 2. Favorito gana 2-0 con n 11-25
- **Team A (Favorito)**: A1 (Rating: 5.00, n: 15), A2 (Rating: 5.00, n: 15) -> RA = 5.00, nTeamA = 15
- **Team B (Underdog)**: B1 (Rating: 4.00, n: 15), B2 (Rating: 4.00, n: 15) -> RB = 4.00, nTeamB = 15
- **Sets**: A gana 2-0
- **Cálculo**:
  - D = 5.00 - 4.00 = 1.00
  - PA = 1 / (1 + exp(-1.00 / 0.55)) = 0.86
  - SA = 1
  - KTeamA = 0.22, KTeamB = 0.22 -> K = 0.22
  - deltaBaseA = 0.22 * (1 - 0.86) = 0.0308
  - deltaSetsA = 0.01 * (2 - 0) = 0.02
  - deltaTeamA_raw = 0.0308 + 0.02 = 0.0508
  - capTeamA = 0.30 -> deltaTeamA = 0.0508
  - deltaTeamB = -0.0508
  - **Reparto**: Al ser iguales, 50% cada uno.
    - deltaA1 = deltaA2 = 0.0508 * 0.5 = 0.0254 -> 0.03
    - deltaB1 = deltaB2 = -0.0508 * 0.5 = -0.0254 -> -0.03

## 3. Favorito pierde 0-2 con n <= 10
- **Team A (Favorito)**: A1 (Rating: 6.00, n: 5), A2 (Rating: 6.00, n: 5) -> RA = 6.00, nTeamA = 5
- **Team B (Underdog)**: B1 (Rating: 4.00, n: 5), B2 (Rating: 4.00, n: 5) -> RB = 4.00, nTeamB = 5
- **Sets**: A pierde 0-2
- **Cálculo**:
  - D = 6.00 - 4.00 = 2.00
  - PA = 1 / (1 + exp(-2.00 / 0.55)) = 0.97
  - SA = 0
  - KTeamA = 0.28, KTeamB = 0.28 -> K = 0.28
  - deltaBaseA = 0.28 * (0 - 0.97) = -0.2716
  - deltaSetsA = 0.01 * (0 - 2) = -0.02
  - deltaTeamA_raw = -0.2916
  - capTeamA = 0.30 -> deltaTeamA = -0.2916
  - deltaTeamB = 0.2916
  - **Reparto**: 50% cada uno.
    - deltaA1 = deltaA2 = -0.2916 * 0.5 = -0.1458 -> capPlayer(5)=0.18 -> -0.15
    - deltaB1 = deltaB2 = 0.2916 * 0.5 = 0.1458 -> capPlayer(5)=0.18 -> 0.15

## 4. Similar gana 2-0 con n 26-60 (cap 0.06)
- **Team A**: A1 (Rating: 4.50, n: 40), A2 (Rating: 4.50, n: 40) -> RA = 4.50, nTeamA = 40
- **Team B**: B1 (Rating: 4.50, n: 40), B2 (Rating: 4.50, n: 40) -> RB = 4.50, nTeamB = 40
- **Sets**: A gana 2-0
- **Cálculo**:
  - D = 0
  - PA = 0.50
  - SA = 1
  - KTeamA = 0.12, KTeamB = 0.12 -> K = 0.12
  - deltaBaseA = 0.12 * (1 - 0.50) = 0.06
  - deltaSetsA = 0.01 * (2 - 0) = 0.02
  - deltaTeamA_raw = 0.08
  - capTeamA = 0.06 (por estar en [26,60]) -> deltaTeamA = 0.06
  - deltaTeamB = -0.06
  - **Reparto**: 50% cada uno.
    - deltaA1 = deltaA2 = 0.03
    - deltaB1 = deltaB2 = -0.03

## 5. Similar pierde 1-2 con n 61+
- **Team A**: A1 (Rating: 5.00, n: 70), A2 (Rating: 5.00, n: 70) -> RA = 5.00, nTeamA = 70
- **Team B**: B1 (Rating: 5.00, n: 70), B2 (Rating: 5.00, n: 70) -> RB = 5.00, nTeamB = 70
- **Sets**: A pierde 1-2
- **Cálculo**:
  - D = 0
  - PA = 0.50
  - SA = 0
  - KTeamA = 0.10, KTeamB = 0.10 -> K = 0.10
  - deltaBaseA = 0.10 * (0 - 0.50) = -0.05
  - deltaSetsA = 0.01 * (1 - 2) = -0.01
  - deltaTeamA_raw = -0.06
  - capTeamA = 0.30 -> deltaTeamA = -0.06
  - deltaTeamB = 0.06
  - **Reparto**: 50% cada uno.
    - deltaA1 = deltaA2 = -0.03
    - deltaB1 = deltaB2 = 0.03

## 6. Caso reparto proporcional (ratings distintos dentro del equipo)
- **Team A**: A1 (Rating: 6.00, n: 20), A2 (Rating: 4.00, n: 20) -> RA = 5.00, nTeamA = 20
- **Team B**: B1 (Rating: 5.00, n: 20), B2 (Rating: 5.00, n: 20) -> RB = 5.00, nTeamB = 20
- **Sets**: A gana 2-0
- **Cálculo**:
  - D = 0
  - PA = 0.50
  - SA = 1
  - KTeamA = 0.22, KTeamB = 0.22 -> K = 0.22
  - deltaBaseA = 0.22 * (1 - 0.50) = 0.11
  - deltaSetsA = 0.01 * (2 - 0) = 0.02
  - deltaTeamA_raw = 0.13
  - capTeamA = 0.30 -> deltaTeamA = 0.13
  - deltaTeamB = -0.13
  - **Reparto A**: shareA1 = 6.00/10.00 = 0.60, shareA2 = 4.00/10.00 = 0.40
    - deltaA1_raw = 0.13 * 0.60 = 0.078 -> 0.08
    - deltaA2_raw = 0.13 * 0.40 = 0.052 -> 0.05
  - **Reparto B**: shareB1 = 5.00/10.00 = 0.50, shareB2 = 5.00/10.00 = 0.50
    - deltaB1_raw = -0.13 * 0.50 = -0.065 -> -0.07
    - deltaB2_raw = -0.13 * 0.50 = -0.065 -> -0.07
