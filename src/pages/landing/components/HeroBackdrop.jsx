// The hero background: real satellite imagery of irrigated fields (a public area near Kura, Kano;
// no client data). The same fields fade between the natural view and a crop-health view (colours
// from greenness: bare ground red, healthy crop green), the way the platform reads them.
// The fade stops for visitors who ask for reduced motion (index.css).
const Z = 16;
const XS = [34306, 34307, 34308, 34309];
const YS = [30616, 30617, 30618];
const tile = (x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${Z}/${y}/${x}`;

const Tiles = ({ className = '', style }) => (
  <div className={`absolute inset-0 grid grid-cols-4 grid-rows-3 ${className}`} style={style}>
    {YS.map((y) => XS.map((x) => (
      <img key={`${x}-${y}`} src={tile(x, y)} alt="" decoding="async" draggable="false" className="w-full h-full object-cover select-none" />
    )))}
  </div>
);

const HeroBackdrop = () => (
  <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
    <svg width="0" height="0" className="absolute">
      <filter id="fi-health" colorInterpolationFilters="sRGB">
        {/* Greenness: more green than red reads as crop, more red as bare ground */}
        <feColorMatrix type="matrix" values="-1.6 2.2 -0.4 0 0.32  -1.6 2.2 -0.4 0 0.32  -1.6 2.2 -0.4 0 0.32  0 0 0 1 0" />
        <feComponentTransfer>
          <feFuncR type="table" tableValues="0.80 0.93 0.97 0.62 0.20 0.09" />
          <feFuncG type="table" tableValues="0.20 0.47 0.78 0.80 0.62 0.45" />
          <feFuncB type="table" tableValues="0.16 0.16 0.22 0.30 0.28 0.22" />
        </feComponentTransfer>
      </filter>
    </svg>
    <Tiles />
    <Tiles className="fi-hero-health" style={{ filter: 'url(#fi-health)' }} />
    <div className="absolute right-6 top-6 hidden lg:block rounded-full bg-white/95 border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-800">
      <span className="fi-hero-label-a">Natural view</span>
      <span className="fi-hero-label-b absolute inset-0 flex items-center justify-center">Crop health view</span>
    </div>
    {/* White behind the text: across on wide screens, downwards on phones */}
    <div className="absolute inset-0 bg-[linear-gradient(180deg,#fff_0%,#fff_55%,rgba(255,255,255,0.6)_80%,rgba(255,255,255,0.1)_100%)] lg:bg-[linear-gradient(90deg,#fff_0%,#fff_34%,rgba(255,255,255,0.8)_48%,rgba(255,255,255,0)_66%)]" />
    <p className="absolute bottom-2 right-3 text-[11px] text-white/90">Imagery © Esri, Maxar, Earthstar Geographics</p>
  </div>
);

export default HeroBackdrop;
