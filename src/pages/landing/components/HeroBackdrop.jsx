// The hero background: real satellite imagery of irrigated fields (a public area near Kura, Kano;
// no client data), panning slowly with a thin scan line, faded to white behind the text.
// Motion stops for visitors who ask for reduced motion (index.css).
const Z = 15;
const XS = [17152, 17153, 17154, 17155];
const YS = [15307, 15308, 15309];
const tile = (x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${Z}/${y}/${x}`;

const HeroBackdrop = () => (
  <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
    <div className="fi-hero-pan absolute -inset-[8%] grid grid-cols-4">
      {YS.map((y) => XS.map((x) => (
        <img key={`${x}-${y}`} src={tile(x, y)} alt="" loading="eager" decoding="async" draggable="false"
          className="w-full h-full object-cover select-none" />
      )))}
    </div>
    <div className="fi-hero-scan absolute inset-y-0 w-px bg-white/80" />
    {/* White fade: across on wide screens (text on the left), downwards on phones */}
    <div className="absolute inset-0 bg-gradient-to-b from-white via-white/95 to-white/40 lg:bg-gradient-to-r lg:from-white lg:via-white/90 lg:to-white/0" />
    <p className="absolute bottom-2 right-3 text-[11px] text-gray-700/80">Imagery © Esri, Maxar, Earthstar Geographics</p>
  </div>
);

export default HeroBackdrop;
