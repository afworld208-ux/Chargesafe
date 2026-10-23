import React from 'react';

export function Header() {
  return (
    <header className="bg-white shadow-sm border-b px-4 py-3 flex justify-between items-center">
      <h1 className="text-xl font-bold text-gray-800">Chargesafe</h1>
      <div className="flex items-center gap-2">
        {/* ആവശ്യാനുസരണം മറ്റ് ബട്ടണുകളോ യൂസർ പ്രൊഫൈലോ ഇവിടെ ചേർക്കാം */}
      </div>
    </header>
  );
}

