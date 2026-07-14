import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, HelpCircle, Activity, Award, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const Home: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">Javno dostupno</div>
        <h1 className="hero-title">
          Queen <span>Tracker</span>
        </h1>
        <p className="hero-subtitle">
          Profesionalna platforma za evidenciju, praćenje kvaliteta i selekciju pčelinjih matica.
          Optimizujte rad vašeg pčelinjaka na osnovu naučnih parametara.
        </p>
        <div className="hero-actions">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary btn-lg">
              Otvori Dashboard <ArrowRight size={18} />
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-primary btn-lg">
                Prijava
              </Link>
              <Link to="/register" className="btn btn-outline btn-lg">
                Registracija
              </Link>
            </>
          )}
          <Link to="/guide" className="btn btn-text btn-lg">
            Vodič za obeležavanje matica <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <h2 className="section-title">Ključne funkcionalnosti sistema</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <ShieldCheck size={32} />
            </div>
            <h3>Evidencija košnica</h3>
            <p>
              Pratite svaku košnicu po oznaci, tipu i lokaciji. Vodite detaljne napomene i istorijat stanja.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Activity size={32} />
            </div>
            <h3>Praćenje matica</h3>
            <p>
              Unosite matice po rasama, godinama izleganja i poreklu. Pratite njihovo premeštanje kroz košnice.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Award size={32} />
            </div>
            <h3>Ocena kvaliteta</h3>
            <p>
              Kroz redovne preglede ocenjujte leglo, intenzitet zaleganja, mirnoću, produktivnost i zdravlje pčela.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <HelpCircle size={32} />
            </div>
            <h3>Pametne preporuke</h3>
            <p>
              Sistem automatski izračunava prosečne ocene i generiše preporuke za zamenu, praćenje ili zadržavanje matica.
            </p>
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="info-banner">
        <div className="info-content">
          <h2>Standardi u pčelarstvu</h2>
          <p>
            Obeležavanje matica vrši se međunarodno dogovorenim bojama po godinama. 
            Ovaj sistem vam pomaže da u svakom trenutku znate starost matice i olakšava njen pronalazak u košnici.
          </p>
          <Link to="/guide" className="btn btn-secondary">
            Pogledaj Vodič za Obeležavanje
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
