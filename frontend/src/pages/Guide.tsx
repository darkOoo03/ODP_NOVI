import React, { useState } from 'react';
import { Calendar, HelpCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ColorGuide {
  digit: string;
  colorName: string;
  colorHex: string;
  textColor: string;
  desc: string;
}

const Guide: React.FC = () => {
  const [testYear, setTestYear] = useState<string>(new Date().getFullYear().toString());
  const [calculatedColor, setCalculatedColor] = useState<ColorGuide | null>(null);

  const guides: ColorGuide[] = [
    { digit: '1 ili 6', colorName: 'BELA (White)', colorHex: '#ffffff', textColor: '#111827', desc: 'Završava se na 1 ili 6 (npr. 2021, 2026, 2031)' },
    { digit: '2 ili 7', colorName: 'ŽUTA (Yellow)', colorHex: '#fbbf24', textColor: '#111827', desc: 'Završava se na 2 ili 7 (npr. 2022, 2027, 2032)' },
    { digit: '3 ili 8', colorName: 'CRVENA (Red)', colorHex: '#ef4444', textColor: '#ffffff', desc: 'Završava se na 3 ili 8 (npr. 2023, 2028, 2033)' },
    { digit: '4 ili 9', colorName: 'ZELENA (Green)', colorHex: '#10b981', textColor: '#ffffff', desc: 'Završava se na 4 ili 9 (npr. 2024, 2029, 2034)' },
    { digit: '5 ili 0', colorName: 'PLAVA (Blue)', colorHex: '#3b82f6', textColor: '#ffffff', desc: 'Završava se na 5 ili 0 (npr. 2020, 2025, 2030)' },
  ];

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const yearInt = parseInt(testYear, 10);
    if (isNaN(yearInt) || yearInt < 2000) {
      alert('Unesite ispravnu godinu (2000 ili noviju).');
      return;
    }

    const lastDigit = yearInt % 10;
    let match: ColorGuide | null = null;

    if (lastDigit === 1 || lastDigit === 6) match = guides[0];
    else if (lastDigit === 2 || lastDigit === 7) match = guides[1];
    else if (lastDigit === 3 || lastDigit === 8) match = guides[2];
    else if (lastDigit === 4 || lastDigit === 9) match = guides[3];
    else if (lastDigit === 5 || lastDigit === 0) match = guides[4];

    setCalculatedColor(match);
  };

  return (
    <div className="guide-container">
      <div className="back-link">
        <Link to="/" className="btn btn-text">
          <ArrowLeft size={16} /> Nazad na početnu
        </Link>
      </div>

      <header className="guide-header">
        <h1>Vodič za obeležavanje matica</h1>
        <p className="subtitle">
          Međunarodni sistem boja za identifikaciju starosti matice.
        </p>
      </header>

      {/* Grid of colors */}
      <section className="color-grid-section">
        <h2>Standardne boje obeležavanja</h2>
        <div className="color-guide-grid">
          {guides.map((g, idx) => (
            <div key={idx} className="color-guide-card">
              <div 
                className="color-display-circle" 
                style={{ backgroundColor: g.colorHex, border: g.colorHex === '#ffffff' ? '2px solid #d1d5db' : 'none' }}
              />
              <div className="color-guide-details">
                <h3>{g.colorName}</h3>
                <p className="digits">Cifra godine: <strong>{g.digit}</strong></p>
                <p className="desc">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Calculator Section */}
      <section className="calculator-section">
        <div className="calculator-card glass-panel">
          <div className="calc-header">
            <Calendar size={24} className="icon-gold" />
            <h2>Kalkulator boje obeležavanja</h2>
          </div>
          <p>Unesite godinu izleganja matice kako biste izračunali njenu standardnu boju.</p>
          
          <form onSubmit={handleCalculate} className="calc-form">
            <div className="form-group">
              <label htmlFor="year-input">Godina izleganja</label>
              <input
                id="year-input"
                type="number"
                min="2000"
                max="2100"
                value={testYear}
                onChange={(e) => setTestYear(e.target.value)}
                placeholder="npr. 2026"
                className="form-control"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">Izračunaj boju</button>
          </form>

          {calculatedColor && (
            <div className="calculator-result-box animated fadeIn">
              <h3>Rezultat proračuna:</h3>
              <div 
                className="calculated-badge"
                style={{ 
                  backgroundColor: calculatedColor.colorHex, 
                  color: calculatedColor.textColor,
                  border: calculatedColor.colorHex === '#ffffff' ? '1px solid #9ca3af' : 'none'
                }}
              >
                {calculatedColor.colorName}
              </div>
              <p>Za maticu izleganu <strong>{testYear}.</strong> godine koristi se <strong>{calculatedColor.colorName.split(' ')[0].toLowerCase()}</strong> boja.</p>
            </div>
          )}
        </div>
      </section>

      {/* Educational info */}
      <section className="guide-faq">
        <div className="faq-item">
          <h3>Zašto se matice obeležavaju?</h3>
          <p>
            Obeležavanje matice olakšava njeno uočavanje među hiljadama pčela radilica tokom rutinskih pregleda košnice. 
            Takođe, boja pruža trenutnu informaciju o njenoj starosti, što je ključno jer se produktivnost matice smanjuje nakon dve godine rada.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Guide;
