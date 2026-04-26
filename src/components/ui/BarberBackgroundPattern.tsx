'use client';

export function BarberBackgroundPattern() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
      aria-hidden="true"
    >
      {/* Camada 1: fundo escuro base */}
      <div style={{ position: 'absolute', inset: 0, background: '#0f1a14' }} />

      {/* Camada 2: ícones SVG de barbearia */}
      <svg
        viewBox="0 0 800 600"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <defs>
          {/* Tesoura — prefixo bb- obrigatório */}
          <g id="bb-scissors">
            <ellipse cx="0" cy="-14" rx="2.5" ry="8" fill="none" stroke="#3db878" strokeWidth="1.2"/>
            <ellipse cx="5" cy="-14" rx="2.5" ry="8" fill="none" stroke="#3db878" strokeWidth="1.2"/>
            <line x1="2.5" y1="-6" x2="0" y2="14" stroke="#3db878" strokeWidth="1.2"/>
            <line x1="2.5" y1="-6" x2="5" y2="14" stroke="#3db878" strokeWidth="1.2"/>
            <circle cx="2.5" cy="-6" r="1.5" fill="#3db878" opacity="0.6"/>
          </g>

          {/* Pente */}
          <g id="bb-comb">
            <rect x="-8" y="-3" width="16" height="5" rx="1" fill="none" stroke="#3db878" strokeWidth="1"/>
            <line x1="-6"   y1="2" x2="-6"   y2="8" stroke="#3db878" strokeWidth="1"/>
            <line x1="-3.5" y1="2" x2="-3.5" y2="8" stroke="#3db878" strokeWidth="1"/>
            <line x1="-1"   y1="2" x2="-1"   y2="8" stroke="#3db878" strokeWidth="1"/>
            <line x1="1.5"  y1="2" x2="1.5"  y2="8" stroke="#3db878" strokeWidth="1"/>
            <line x1="4"    y1="2" x2="4"    y2="8" stroke="#3db878" strokeWidth="1"/>
            <line x1="6"    y1="2" x2="6"    y2="8" stroke="#3db878" strokeWidth="1"/>
          </g>

          {/* Spray */}
          <g id="bb-spray">
            <rect x="-5" y="0" width="10" height="14" rx="3" fill="none" stroke="#3db878" strokeWidth="1.1"/>
            <rect x="-2" y="-6" width="5" height="7" rx="1.5" fill="none" stroke="#3db878" strokeWidth="1.1"/>
            <line x1="3" y1="-4" x2="8" y2="-4" stroke="#3db878" strokeWidth="1.1"/>
            <circle cx="9"  cy="-4" r="1"   fill="#3db878" opacity="0.5"/>
            <circle cx="10" cy="-7" r="0.7" fill="#3db878" opacity="0.4"/>
            <circle cx="12" cy="-3" r="0.7" fill="#3db878" opacity="0.3"/>
          </g>

          {/* Navalha */}
          <g id="bb-razor">
            <rect x="-1.5" y="-12" width="3" height="24" rx="1.5" fill="none" stroke="#3db878" strokeWidth="1.1"/>
            <rect x="-3.5" y="-12" width="7" height="5" rx="1" fill="none" stroke="#3db878" strokeWidth="1"/>
          </g>

          {/* Secador */}
          <g id="bb-dryer">
            <ellipse cx="0" cy="0" rx="9" ry="7" fill="none" stroke="#3db878" strokeWidth="1.1"/>
            <line x1="9"  y1="0"  x2="16" y2="0"  stroke="#3db878" strokeWidth="1.1"/>
            <line x1="9"  y1="-3" x2="16" y2="-5" stroke="#3db878" strokeWidth="1"/>
            <circle cx="16" cy="0" r="2" fill="none" stroke="#3db878" strokeWidth="1"/>
            <circle cx="-3" cy="0" r="3" fill="none" stroke="#3db878" strokeWidth="0.8" opacity="0.5"/>
          </g>

          {/* Pincel */}
          <g id="bb-brush">
            <rect x="-2" y="-12" width="4" height="16" rx="1" fill="none" stroke="#3db878" strokeWidth="1.1"/>
            <ellipse cx="0" cy="6" rx="3" ry="5" fill="none" stroke="#3db878" strokeWidth="1"/>
          </g>
        </defs>

        <g opacity="0.18">
          {/* ROW 1 */}
          <use href="#bb-scissors" transform="translate(60,50) rotate(25) scale(1.8)"/>
          <use href="#bb-comb"     transform="translate(140,30) rotate(-10) scale(1.6)"/>
          <use href="#bb-spray"    transform="translate(230,60) rotate(15) scale(1.5)"/>
          <use href="#bb-razor"    transform="translate(310,35) rotate(30) scale(1.7)"/>
          <use href="#bb-dryer"    transform="translate(400,55) rotate(-20) scale(1.4)"/>
          <use href="#bb-scissors" transform="translate(490,25) rotate(45) scale(1.6)"/>
          <use href="#bb-brush"    transform="translate(570,50) rotate(-15) scale(1.8)"/>
          <use href="#bb-comb"     transform="translate(650,30) rotate(20) scale(1.5)"/>
          <use href="#bb-spray"    transform="translate(740,55) rotate(-30) scale(1.6)"/>
          {/* ROW 2 */}
          <use href="#bb-razor"    transform="translate(30,120) rotate(-20) scale(1.6)"/>
          <use href="#bb-dryer"    transform="translate(110,140) rotate(10) scale(1.3)"/>
          <use href="#bb-brush"    transform="translate(195,115) rotate(35) scale(1.7)"/>
          <use href="#bb-scissors" transform="translate(280,145) rotate(-40) scale(1.5)"/>
          <use href="#bb-comb"     transform="translate(365,120) rotate(15) scale(1.6)"/>
          <use href="#bb-spray"    transform="translate(450,140) rotate(-25) scale(1.4)"/>
          <use href="#bb-razor"    transform="translate(535,115) rotate(50) scale(1.8)"/>
          <use href="#bb-dryer"    transform="translate(620,140) rotate(-10) scale(1.3)"/>
          <use href="#bb-brush"    transform="translate(710,120) rotate(20) scale(1.6)"/>
          <use href="#bb-scissors" transform="translate(785,140) rotate(-35) scale(1.5)"/>
          {/* ROW 3 */}
          <use href="#bb-comb"     transform="translate(75,210) rotate(40) scale(1.5)"/>
          <use href="#bb-spray"    transform="translate(160,225) rotate(-15) scale(1.7)"/>
          <use href="#bb-razor"    transform="translate(245,205) rotate(10) scale(1.6)"/>
          <use href="#bb-dryer"    transform="translate(330,230) rotate(30) scale(1.4)"/>
          <use href="#bb-brush"    transform="translate(420,210) rotate(-45) scale(1.8)"/>
          <use href="#bb-scissors" transform="translate(505,225) rotate(20) scale(1.5)"/>
          <use href="#bb-comb"     transform="translate(590,205) rotate(-30) scale(1.6)"/>
          <use href="#bb-spray"    transform="translate(670,225) rotate(15) scale(1.4)"/>
          <use href="#bb-razor"    transform="translate(755,210) rotate(-20) scale(1.7)"/>
          {/* ROW 4 */}
          <use href="#bb-dryer"    transform="translate(45,300) rotate(-10) scale(1.3)"/>
          <use href="#bb-brush"    transform="translate(130,315) rotate(25) scale(1.7)"/>
          <use href="#bb-scissors" transform="translate(215,295) rotate(-50) scale(1.6)"/>
          <use href="#bb-comb"     transform="translate(300,315) rotate(35) scale(1.5)"/>
          <use href="#bb-spray"    transform="translate(385,295) rotate(-20) scale(1.6)"/>
          <use href="#bb-razor"    transform="translate(470,315) rotate(40) scale(1.8)"/>
          <use href="#bb-dryer"    transform="translate(555,295) rotate(-15) scale(1.3)"/>
          <use href="#bb-brush"    transform="translate(640,315) rotate(10) scale(1.7)"/>
          <use href="#bb-scissors" transform="translate(725,295) rotate(-35) scale(1.5)"/>
          {/* ROW 5 */}
          <use href="#bb-comb"     transform="translate(65,385) rotate(-25) scale(1.6)"/>
          <use href="#bb-spray"    transform="translate(150,400) rotate(30) scale(1.5)"/>
          <use href="#bb-razor"    transform="translate(235,380) rotate(-10) scale(1.7)"/>
          <use href="#bb-dryer"    transform="translate(320,400) rotate(20) scale(1.4)"/>
          <use href="#bb-brush"    transform="translate(410,380) rotate(-45) scale(1.8)"/>
          <use href="#bb-scissors" transform="translate(495,400) rotate(15) scale(1.6)"/>
          <use href="#bb-comb"     transform="translate(580,380) rotate(-30) scale(1.5)"/>
          <use href="#bb-spray"    transform="translate(660,400) rotate(25) scale(1.6)"/>
          <use href="#bb-razor"    transform="translate(745,380) rotate(-15) scale(1.7)"/>
          {/* ROW 6 */}
          <use href="#bb-dryer"    transform="translate(35,470) rotate(15) scale(1.3)"/>
          <use href="#bb-brush"    transform="translate(120,485) rotate(-20) scale(1.7)"/>
          <use href="#bb-scissors" transform="translate(205,465) rotate(40) scale(1.5)"/>
          <use href="#bb-comb"     transform="translate(290,485) rotate(-35) scale(1.6)"/>
          <use href="#bb-spray"    transform="translate(375,465) rotate(10) scale(1.5)"/>
          <use href="#bb-razor"    transform="translate(460,485) rotate(-50) scale(1.8)"/>
          <use href="#bb-dryer"    transform="translate(545,465) rotate(25) scale(1.3)"/>
          <use href="#bb-brush"    transform="translate(630,485) rotate(-15) scale(1.7)"/>
          <use href="#bb-scissors" transform="translate(715,465) rotate(35) scale(1.5)"/>
          <use href="#bb-comb"     transform="translate(780,485) rotate(-10) scale(1.6)"/>
          {/* ROW 7 */}
          <use href="#bb-spray"    transform="translate(55,555) rotate(-30) scale(1.5)"/>
          <use href="#bb-razor"    transform="translate(140,540) rotate(20) scale(1.7)"/>
          <use href="#bb-dryer"    transform="translate(225,558) rotate(-10) scale(1.4)"/>
          <use href="#bb-brush"    transform="translate(315,540) rotate(45) scale(1.8)"/>
          <use href="#bb-scissors" transform="translate(400,558) rotate(-25) scale(1.6)"/>
          <use href="#bb-comb"     transform="translate(485,540) rotate(15) scale(1.5)"/>
          <use href="#bb-spray"    transform="translate(570,558) rotate(-40) scale(1.6)"/>
          <use href="#bb-razor"    transform="translate(655,540) rotate(30) scale(1.7)"/>
          <use href="#bb-dryer"    transform="translate(745,558) rotate(-20) scale(1.3)"/>
        </g>
      </svg>

      {/* Camada 3: gradient overlay — escurece bordas, suaviza centro */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 70% 60% at 50% 50%, ' +
            'rgba(15,26,20,0.55) 0%, rgba(15,26,20,0.92) 100%)',
        }}
      />
    </div>
  );
}
