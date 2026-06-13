import React, { useState } from 'react';

export default function TarotCard({ cardName, meaning, image }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="tarot-card-container" 
      onClick={() => setIsFlipped(!isFlipped)}
      style={{
        width: '100%',
        height: '100%',
        perspective: '1000px',
        cursor: 'pointer'
      }}
    >
      <div 
        className="tarot-card-inner"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transition: 'transform 0.6s',
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* KARTIN ÖN YÜZÜ (Mistik Desen yerine artık Çizim var) */}
        <div 
          className="tarot-card-front"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            borderRadius: '12px',
            border: '2px solid #d4af37',
            overflow: 'hidden', // Resmin köşelerden taşmasını engeller
            backgroundColor: '#1a0b2e',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {/* Eğer resim yolu tanımlanmışsa resmi göster, yoksa hata vermemesi için boşluk bırak */}
          {image ? (
            <img 
              src={image} 
              alt={cardName} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          ) : (
            <span style={{ color: '#d4af37' }}>Mistik Desen</span>
          )}
        </div>

        {/* KARTIN ARKA YÜZÜ (Çevrilince görünen açıklama ve isim) */}
        <div 
          className="tarot-card-back"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            backgroundColor: '#f4e8d4',
            color: '#0f0c20',
            transform: 'rotateY(180deg)',
            borderRadius: '12px',
            border: '2px dashed #d4af37',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center'
          }}
        >
          <h4 style={{ fontSize: '1rem', marginBottom: '8px', fontWeight: 'bold' }}>{cardName}</h4>
          <p style={{ fontSize: '0.8rem', lineHeight: '1.2' }}>{meaning}</p>
        </div>
      </div>
    </div>
  );
}