import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import TarotCard from './TarotCard';
import WitchModel from './WitchModel';
import { tarotDeckData } from './tarotData';
import './TarotTable.css';

const TypewriterText = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 30); 
    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayedText}</span>;
};

function App() {
  const [visualDeck, setVisualDeck] = useState([]);
  const [availableCards, setAvailableCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]); // Tüm seçilen kartlar
  
  const [inputText, setInputText] = useState("");
  const [isInputLocked, setIsInputLocked] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  
  const [fullReading, setFullReading] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // YENİ: Tur (Turn) ve Hafıza (History) State'leri
  const [turn, setTurn] = useState(1);
  const [maxTurns, setMaxTurns] = useState(3); // Toplam açıklama sayısı
  const [chatHistory, setChatHistory] = useState([]); // OpenAI'a gidecek geçmiş
  const [awaitingCard, setAwaitingCard] = useState(false);
  const [cardsToDraw, setCardsToDraw] = useState(3);
  const [tempDrawnCards, setTempDrawnCards] = useState([]); // Sadece o tur çekilen kart(lar)

  useEffect(() => {
    startShuffleAndReset();
  }, []);

  const startShuffleAndReset = () => {
    setIsShuffling(true);
    setSelectedCards([]);
    setTempDrawnCards([]);
    setChatHistory([]);
    setTurn(1);
    setCardsToDraw(3);
    setAwaitingCard(false);
    setInputText("");
    setIsInputLocked(false);
    setFullReading("");
    setIsModalOpen(false);

    // YENİ: Yapay zekanın bu fal için ne kadar derine inmek istediğine (2 ile 5 tur arası) rastgele karar vermesi
    const randomTurns = Math.floor(Math.random() * 4) + 2; // 2, 3, 4 veya 5 üretecek
    setMaxTurns(randomTurns);
    
    setAvailableCards([...tarotDeckData]);
    setVisualDeck(Array.from({ length: 78 }, (_, index) => ({ id: index })));
    setAiMessage("Hoş geldin yolcu... Önce aşağıdaki kutuya niyetini fısılda ve bana gönder.");

    setTimeout(() => setIsShuffling(false), 800);
  };

  const handleInputSubmit = () => {
    if (inputText.trim().length < 3) {
      setAiMessage("Benden bir şey saklama... Kelimelerini seç ki yıldızlar seni duysun.");
      return;
    }
    
    setIsInputLocked(true);
    setAwaitingCard(true);
    setTempDrawnCards([]); // Yeni tur için kartları sıfırla

    if (turn === 1) {
      setAiMessage("Niyetini aldım... Şimdi desteden sırasıyla Geçmiş, Şimdi ve Gelecek için 3 kart seç.");
      setCardsToDraw(3);
    } else {
      setAiMessage("Sözlerini duydum... Şimdi bu duruma ışık tutmak için desteden 1 kart daha seç.");
      setCardsToDraw(1);
    }
  };

  const drawCard = async (visualCardId) => {
    if (!awaitingCard) {
      setAiMessage(turn === 1 ? "Önce niyetini bilmeliyim..." : "Şu an kart çekme zamanı değil, önce soruma cevap ver.");
      return;
    }
    
    if (tempDrawnCards.length >= cardsToDraw || isLoading || isShuffling) return;

    const randomIndex = Math.floor(Math.random() * availableCards.length);
    const drawnCard = availableCards[randomIndex];
    
    const newSelectedCards = [...selectedCards, drawnCard];
    const newTempDrawnCards = [...tempDrawnCards, drawnCard];
    
    setSelectedCards(newSelectedCards);
    setTempDrawnCards(newTempDrawnCards);
    setAvailableCards(availableCards.filter((_, index) => index !== randomIndex));
    setVisualDeck(visualDeck.map(card => card.id === visualCardId ? { ...card, isHidden: true } : card));

    // O tur için gereken kartlar çekildiyse API'yi tetikle
    if (newTempDrawnCards.length === cardsToDraw) {
      setAwaitingCard(false);
      setAiMessage("Kartlar açıldı... Yıldızların fısıltısını dinliyorum, bekle...");
      await fetchTarotReading(newTempDrawnCards);
    }
  };

  const fetchTarotReading = async (drawnCardsForThisTurn) => {
    setIsLoading(true);

    // 1. SİSTEM KOMUTU: Karakteri Kesin Çizgilerle Belirliyoruz
    let messages = [
      { 
        role: 'system', 
        content: `Sen bir falcı gibi gizemli, hafif alaycı ve bilge bir cadısın. Mistik bir dille tarot falı bakıyorsun. 
        KURAL: Eğer söylemen gerekn kötüyse gene de söyle, sen daima doğruları konuşursun.
        ÖZEL DURUM: Eğer kullanıcı niyet veya cevap olarak saçma sapan şeyler (örn: "cart curt", "zart zurt", rastgele harfler, mantıksız kelimeler ya da sana hakaret veya sataşmalar) yazarsa, onunla o iğneleyici ve soğuk tarzınla dalga geç. Ciddiyetsizliğini yüzüne vur, "Bana böyle aptalca sözlerle mi geliyorsun fani?" tarzı bir tepki ver ama yine de çektiği kartları onun bu laubali tavrı üzerinden yorumlayıp, onu ters köşe yapan bir soru sor.
        Sözlerin gerçekçi, psikolojik olarak nokta atışı yapan, doğrudan karşındakinin hayatına ve zaaflarına dokunan türden olmalı.` 
      }
    ];

    chatHistory.forEach(msg => messages.push(msg)); 

    // 2. KULLANICI KOMUTU: Sorunun Niteliğini Değiştiriyoruz
    let prompt = "";
    if (turn === 1) {
      prompt = `Kullanıcının niyeti: "${inputText}". 
      Seçtiği kartlar: 
      1. ${drawnCardsForThisTurn[0].name} (${drawnCardsForThisTurn[0].meaning})
      2. ${drawnCardsForThisTurn[1].name} (${drawnCardsForThisTurn[1].meaning})
      3. ${drawnCardsForThisTurn[2].name} (${drawnCardsForThisTurn[2].meaning}).
      Bu kartlarla durumu yorumla. Yorumun sonunda, niyetindeki asıl meseleyi deşecek, doğrudan onun gerçek hayatına, kararlarına veya sakladığı korkularına dokunan, ÇOK NET, KİŞİSEL VE YÜZLEŞTİRİCİ BİR SORU SOR. Biraz şiirsel, ama fazlasıyla gerçekçi ol.`;
    } else {
      prompt = `Kullanıcının önceki soruna verdiği cevap: "${inputText}". 
      Bunun üzerine çektiği yeni ekstra kart: ${drawnCardsForThisTurn[0].name} (${drawnCardsForThisTurn[0].meaning}).
      Cevabını ve bu yeni kartı bağdaştırarak onu kendi gerçeğiyle yüzleştir. 
      ${turn < maxTurns 
        ? "Yorumun sonunda yine onun psikolojisini ve niyetini deşecek, çok net ve kişisel YENİ BİR SORU SOR. Soyut kavramlardan kaçın." 
        : "Bu senin son yorumun. Artık soru sorma. Çıkan tüm kartları, niyetini ve aranızdaki konuşmayı bağlayarak yüzleşmesi gereken acı veya tatlı gerçekliği net bir dille söyle ve bitir."}`;
    }

    messages.push({ role: 'user', content: prompt });

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o', // veya gpt-3.5-turbo
          messages: messages,
          temperature: 0.7, // 0.8'den 0.7'ye düşürdük. AI daha odaklı ve mantıklı (daha az uçuk) cevaplar verecek.
        })
      });

      const data = await response.json();
      const reading = data.choices[0].message.content;
      
      setChatHistory([
        ...chatHistory,
        { role: 'user', content: prompt },
        { role: 'assistant', content: reading }
      ]);
      
      const turnTitle = turn === 1 ? "ANA AÇILIM" : `${turn}. DERİNLEŞME (Ekstra Kart)`;
      setFullReading(prev => prev + (prev ? "\n\n---\n\n" : "") + `[ ${turnTitle} ]\n${reading}`);
      setIsModalOpen(true);
      
      if (turn < maxTurns) {
        setAiMessage("Yıldızlar konuştu. Falını oku ve aşağıdaki kutudan soruma dürüstçe cevap ver...");
        setTurn(turn + 1);
        setInputText(""); 
        setIsInputLocked(false); 
      } else {
        setAiMessage("Yıldızların söyleyecekleri bitti. Gerçeklerle yüzleşme vakti.");
      }

    } catch (error) {
      console.error("API Hatası:", error);
      setAiMessage("Yıldızlarla olan bağlantım koptu... Daha sonra tekrar dene.");
    } finally {
      setIsLoading(false);
    }
  };

  const labels = ["GEÇMİŞ", "ŞİMDİ", "GELECEK"];

  return (
    <div className="app-container">
      
      {/* SOL ÜST: Kartlar */}
      <div className="top-left">
        <div className="slots-area" style={{ marginTop: '0' }}>
          {labels.map((label, index) => {
            const cardData = selectedCards[index];
            return (
              <div className="slot" key={index}>
                {cardData ? (
                    <TarotCard cardName={cardData.name} meaning={cardData.meaning} image={cardData.image} />
                ) : <span>+</span>}
                <div className="slot-label">{label}</div>
              </div>
            );
          })}
        </div>

        {/* Sonradan Seçilen Ekstra Kartlar (Soru-Cevap Kısmında Gelenler) */}
        {selectedCards.length > 3 && (
          <div style={{ display: 'flex', gap: '15px', marginTop: '30px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
            {selectedCards.slice(3).map((cardData, index) => (
              // Kartlara sabit bir boyut verdik ki içe çökmesinler (Ana kartlardan biraz daha küçükler)
              <div key={index + 3} style={{ width: '100px', height: '160px' }}>
                <TarotCard cardName={cardData.name} meaning={cardData.meaning} image={cardData.image} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SOL ALT: Chat Bar ve Butonlar */}
      <div className="bottom-left">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ color: '#d4af37' }}>Ritüel Alanı</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            {fullReading && (
              <button 
                onClick={() => setIsModalOpen(true)}
                style={{ background: '#d4af37', border: 'none', color: '#0f0c20', padding: '5px 15px', borderRadius: '15px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Falı Göster
              </button>
            )}
            <button 
              onClick={startShuffleAndReset}
              style={{ background: 'transparent', border: '1px solid #d4af37', color: '#d4af37', padding: '5px 15px', borderRadius: '15px', cursor: 'pointer' }}
            >
              Baştan Başla
            </button>
          </div>
        </div>

        <div className="chat-input-wrapper">
          <input 
            type="text" 
            className="chat-input"
            placeholder={
              turn > maxTurns ? "Fal tamamlandı..." : 
              isInputLocked ? "Sıra yıldızlarda, kartlarını seç..." : 
              (turn === 1 ? "Niyetini buraya fısılda..." : "Soruma cevabını buraya yaz...")
            } 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isInputLocked || turn > maxTurns}
          />
          <button 
            className="send-button" 
            onClick={handleInputSubmit}
            disabled={isInputLocked || turn > maxTurns}
            style={{ opacity: (isInputLocked || turn > maxTurns) ? 0.5 : 1 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>

      {/* SAĞ ÜST: 3D Model */}
      <div className="top-right">
        <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
          <Canvas camera={{ position: [0, 0, 6] }}>
            <ambientLight intensity={1.5} />
            <directionalLight position={[10, 10, 5]} intensity={2} />
            <React.Suspense fallback={null}>
               <WitchModel />
            </React.Suspense>
            <OrbitControls enableZoom={false} enablePan={false} />
          </Canvas>
        </div>
        
        <div 
          className="speech-bubble" 
          style={{ cursor: fullReading ? 'pointer' : 'default' }}
          onClick={() => fullReading && setIsModalOpen(true)}
        >
          <TypewriterText text={aiMessage} />
        </div>
      </div>

      {/* SAĞ ALT: Deste */}
      <div className="bottom-right">
        <div className={`deck-area ${isShuffling ? 'is-shuffling' : ''}`} style={{ marginTop: '0' }}>
          {visualDeck.map((card) => (
            <div 
              key={card.id} 
              className={`deck-card ${card.isHidden ? 'hidden' : ''}`}
              onClick={() => drawCard(card.id)}
            ></div>
          ))}
        </div>
      </div>

      {/* POP-UP (MODAL) EKRANI */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setIsModalOpen(false)}>✖</button>
            <h2 style={{ color: '#d4af37', marginBottom: '20px', textAlign: 'center', borderBottom: '1px solid rgba(212, 175, 55, 0.3)', paddingBottom: '15px' }}>
              Yıldızların Fısıltısı
            </h2>
            {fullReading.split('\n').map((paragraph, index) => (
              paragraph.trim() !== "" && (
                <p key={index} style={{ marginBottom: paragraph.includes('---') ? '15px' : '10px', color: paragraph.includes('[') ? '#d4af37' : '#f4e8d4', fontWeight: paragraph.includes('[') ? 'bold' : 'normal' }}>
                  {paragraph}
                </p>
              )
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

export default App;