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
        <div className="absolute inset-0" style={{background: 'linear-gradient(to bottom, transparent 0%, rgba(18, 9, 24, 0.5) 50%, #120918 100%)'}} />
        
        {/* Name and icon overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center gap-3">
            {arc.icon && (
              <span className="bg-[#130918]/20 backdrop-blur-sm p-2 rounded-md border border-light">
                <img
                  src={arc.icon}
                  alt={`${arc.name} icon`}
                  className="w-12 h-12 object-contain"
                  loading="lazy"
                />
              </span>
            )}
            <h2 className="text-5xl font-black text-light uppercase tracking-wider">
              {arc.name}
            </h2>
          </div>
        </div>
      </div>
      
      {/* Description section */}
      <div className="p-6">
        <p className="leading-relaxed">
          {arc.description}
        </p>
      </div>
    </div>
  );
}