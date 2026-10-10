import React from 'react';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import { Scale, BookOpen, AlertCircle, FileText } from 'lucide-react';

const LegalPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <PublicHeader />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 flex-1 w-full">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
              <Scale size={22} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900">Legal Terms & Geospatial Licensing</h1>
              <p className="text-xs text-slate-500">Terms of Service, Open Data Attributions, and Acceptable Use</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed mt-4">
            FarmIntelytics integrates open-access public satellite missions and global earth observation repositories under fair use and open licensing agreements.
          </p>

          <div className="mt-8 space-y-6">
            <section className="border-t border-slate-100 pt-6">
              <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                <BookOpen size={17} className="text-blue-600" /> Data Source Attributions
              </h2>
              <ul className="text-xs sm:text-sm text-slate-600 space-y-2 list-disc pl-5">
                <li><strong>Copernicus Sentinel-1 & Sentinel-2:</strong> European Space Agency (ESA) & European Union Open Data.</li>
                <li><strong>USGS Landsat 8/9:</strong> U.S. Geological Survey & NASA open access repository.</li>
                <li><strong>Climate Normals (CHIRPS & ERA5-Land):</strong> UC Santa Barbara Climate Hazards Center & ECMWF.</li>
                <li><strong>SoilGrids 250m:</strong> International Soil Reference and Information Centre (ISRIC).</li>
                <li><strong>Copernicus DEM GLO-30:</strong> European Space Agency 30m Global Digital Elevation Model.</li>
                <li><strong>Protected Areas:</strong> World Database on Protected Areas (WDPA) & UNEP-WCMC.</li>
              </ul>
            </section>

            <section className="border-t border-slate-100 pt-6">
              <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                <FileText size={17} className="text-blue-600" /> Acceptable Use & Intellectual Property
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Subscribing organisations retain 100% intellectual property of their spatial boundaries, uploaded soil ground-truth samples, drone orthomosaics, and custom threshold configurations. Platform analytics algorithms and analytical pipeline software remain the property of FarmIntelytics / Earthintelytics.
              </p>
            </section>

            <section className="border-t border-slate-100 pt-6">
              <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                <AlertCircle size={17} className="text-amber-600" /> Agronomic Advisory Disclaimer
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Suitability indices, yield estimations, and satellite vegetation curves serve as macro and meso decision-support planning tools. On-the-ground agronomic verification is recommended before major capital investments.
              </p>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default LegalPage;
