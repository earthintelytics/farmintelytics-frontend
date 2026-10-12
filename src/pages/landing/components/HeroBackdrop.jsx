// The hero background: real satellite imagery of irrigated fields (a public area near Kura, Kano;
// no client data). The same fields fade between the natural view and a crop-health view (colours
// from greenness: bare ground red, healthy crop green), the way the platform reads them.
// The fade stops for visitors who ask for reduced motion (index.css).
const Z = 16;
const XS = [34304, 34305, 34306, 34307, 34308, 34309];
const YS = [30616, 30617, 30618];
const tile = (x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${Z}/${y}/${x}`;

const Tiles = ({ className = '', style }) => (
  // Tiles at their own size (256 px), anchored right, so the imagery stays sharp on wide screens.
  <div className={`absolute right-0 top-1/2 -translate-y-1/2 grid grid-cols-[repeat(6,256px)] grid-rows-[repeat(3,256px)] ${className}`} style={style}>
    {YS.map((y) => XS.map((x) => (
      <img key={`${x}-${y}`} src={tile(x, y)} alt="" decoding="async" draggable="false" className="w-64 h-64 select-none" />
    )))}
  </div>
);

const HeroBackdrop = () => (
  <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
    <svg width="0" height="0" className="absolute">
      <filter id="fi-health" colorInterpolationFilters="sRGB">
        {/* Greenness: more green than red reads as crop, more red as bare ground */}
        <feColorMatrix type="matrix" values="-2.4 3.2 -0.8 0 0.42  -2.4 3.2 -0.8 0 0.42  -2.4 3.2 -0.8 0 0.42  0 0 0 1 0" />
        <feComponentTransfer>
          <feFuncR type="table" tableValues="0.80 0.93 0.97 0.62 0.20 0.09" />
          <feFuncG type="table" tableValues="0.20 0.47 0.78 0.80 0.62 0.45" />
          <feFuncB type="table" tableValues="0.16 0.16 0.22 0.30 0.28 0.22" />
        </feComponentTransfer>
      </filter>
      <filter id="fi-water" colorInterpolationFilters="sRGB">
        {/* Wetness: dark, green ground reads as wet; bright bare soil as dry */}
        <feColorMatrix type="matrix" values="-1.9 1.4 -0.9 0 0.95  -1.9 1.4 -0.9 0 0.95  -1.9 1.4 -0.9 0 0.95  0 0 0 1 0" />
        <feComponentTransfer>
          <feFuncR type="table" tableValues="0.80 0.93 0.96 0.62 0.24 0.12" />
          <feFuncG type="table" tableValues="0.38 0.64 0.90 0.80 0.52 0.33" />
          <feFuncB type="table" tableValues="0.14 0.28 0.70 0.90 0.82 0.66" />
        </feComponentTransfer>
      </filter>
    </svg>
    <Tiles />
    <Tiles className="fi-hero-health" style={{ filter: 'url(#fi-health)' }} />
    <Tiles className="fi-hero-water" style={{ filter: 'url(#fi-water)' }} />
    <div className="absolute right-6 top-6 hidden lg:block w-36 text-center whitespace-nowrap rounded-full bg-white/95 border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-800">
      <span className="fi-hero-label-a">Natural view</span>
      <span className="fi-hero-label-b absolute inset-0 flex items-center justify-center">Crop health view</span>
      <span className="fi-hero-label-c absolute inset-0 flex items-center justify-center">Water need view</span>
    </div>
    {/* White behind the text: across on wide screens, downwards on phones */}
    <div className="absolute inset-0 bg-[linear-gradient(180deg,#fff_0%,#fff_55%,rgba(255,255,255,0.6)_80%,rgba(255,255,255,0.1)_100%)] lg:bg-[linear-gradient(90deg,#fff_0%,#fff_34%,rgba(255,255,255,0.8)_48%,rgba(255,255,255,0)_66%)]" />
    <p className="absolute bottom-2 right-3 text-[11px] text-white/90">Imagery © Esri, Maxar, Earthstar Geographics</p>
  </div>
);

export default HeroBackdrop;
