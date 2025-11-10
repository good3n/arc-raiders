import React from 'react';

interface ArcCardProps {
  arc: {
    id: string;
    name: string;
    description: string;
    icon?: string;
    image?: string;
  };
}

export default function ArcCard({ arc }: ArcCardProps) {
  // bombardier image is not in the data, so we need to set it manually
  if (arc.name === 'Bombardier') {
    arc.image = 'https://arcraiders.wiki/w/images/7/76/ARC_Bombardier.png';
  }
  return (
    <div className="rounded-2xl overflow-hidden bg-[#120918]">
      {/* Image section with gradient overlay */}
      <div className="relative h-[300px] overflow-hidden">
        {arc.image && (
          <img
            src={arc.image}
            alt={arc.name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#120918]/50 to-[#120918]" />
        
        {/* Name and icon overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center gap-3">
            {arc.icon && (
              <img
                src={arc.icon}
                alt={`${arc.name} icon`}
                className="w-12 h-12 object-contain"
                loading="lazy"
              />
            )}
            <h2 className="text-5xl font-black text-white uppercase tracking-wider">
              {arc.name}
            </h2>
          </div>
        </div>
      </div>
      
      {/* Description section */}
      <div className="px-6 pb-6">
        <p className="text-gray-300 leading-relaxed">
          {arc.description}
        </p>
      </div>
    </div>
  );
}