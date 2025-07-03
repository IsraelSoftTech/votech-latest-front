import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiService from '../services/api';
import logo from '../assets/logo.png';
import { MdInfo, MdLocationOn, MdConfirmationNumber, MdPhone, MdEmail, MdFacebook } from 'react-icons/md';
import { FaYoutube } from 'react-icons/fa';
import './Home.css';
import Loader from './Loader';

const fallbackImg = 'https://via.placeholder.com/240x160?text=No+Image';
// Automatically set backend base URL for images: use localhost:5000 for local dev, window.location.origin for production
const BACKEND_BASE_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : window.location.origin;

const infoSections = [
  {
    icon: <MdInfo />, title: 'About MPASAT',
    body: 'MPASAT is a unique educational center that combines grammar, technical, and vocational education to provide comprehensive learning opportunities. Our institution is committed to delivering quality education that prepares students for both academic excellence and practical skills development. We pride ourselves in offering a diverse range of programs that cater to various career paths and personal development goals.'
  },
  {
    icon: <MdConfirmationNumber />, title: 'Registration Number',
    body: 'Reg. No. 697/L/MINESEC/SG/DESG/SDSEPESG/SSGEPESG of 1/12/2022'
  },
  {
    icon: <MdLocationOn />, title: 'Location',
    body: 'Mile 3 Nkwen\nBamenda\nNorth West Region\nCameroon'
  },
  {
    icon: <MdPhone />, title: 'Contact',
    body: '+237 679953185'
  },
  {
    icon: <MdEmail />, title: 'Email',
    body: 'mbakwaphosphate@gmail.com'
  },
  {
    icon: <MdFacebook />, title: 'Facebook',
    body: 'Mpasat'
  },
  {
    icon: <FaYoutube />, title: 'Youtube',
    body: 'Mbakwaphosphate Academy'
  }
];

const fadeColors = [
  '#e3f0fa', // blue fade
  '#eafbe3', // green fade
  '#fffbe3', // yellow fade
  '#fbe3e3', // red fade
  '#f3e3fb', // purple fade
  '#e3f7fb', // cyan fade
  '#fbeee3', // orange fade
];

function Home() {
  const navigate = useNavigate();
  const [vocationals, setVocationals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    const fetchVocationals = async () => {
      try {
        const data = await ApiService.getPublicVocational();
        setVocationals(Array.isArray(data) ? data : []);
      } catch (err) {
        setVocationals([]);
      } finally {
        setLoading(false);
      }
    };
    fetchVocationals();
  }, []);

  const handleGetStarted = () => {
    setShowLoader(true);
    setTimeout(() => {
      setShowLoader(false);
      navigate('/login');
    }, 2000);
  };

  if (showLoader) return <Loader />;

  return (
    <div className="home-root">
      <header className="home-header">
        <div className="home-logo-title">
          <img src={logo} alt="MPASAT Logo" className="home-logo" />
          <span className="home-title">MPASAT ADMISSION PORTAL</span>
        </div>
        <button className="home-get-started-btn" onClick={handleGetStarted}>Get Started</button>
      </header>
      <main className="home-main">
        <section className="home-info-section">
          {infoSections.map((section, idx) => (
            <div
              className="home-info-card home-fade-bg"
              key={section.title}
              style={{ background: fadeColors[idx % fadeColors.length] }}
            >
              <div className="home-info-header">{section.icon} {section.title}</div>
              <div className="home-info-body">
                {section.body.split('\n').map((line, i) => (
                  <span key={i}>{line}<br /></span>
                ))}
              </div>
            </div>
          ))}
        </section>
        <section className="home-vocationals-section">
          <h2 className="home-vocationals-title">Our Vocational Programs</h2>
          {loading ? (
            <div className="home-vocational-loading">Loading vocationals...</div>
          ) : Array.isArray(vocationals) && vocationals.length > 0 ? (
            <div className="home-vocationals-grid">
              {vocationals.map((voc) => (
                <div className="home-vocational-card" key={voc.id}>
                  <h3 className="home-vocational-title">{voc.title}</h3>
                  <p className="home-vocational-desc">{voc.description}</p>
                  <div className="home-vocational-images-2x2">
                    {[voc.picture1, voc.picture2, voc.picture3, voc.picture4].map((pic, idx) => {
                      let imgSrc = fallbackImg;
                      if (pic) {
                        imgSrc = pic.startsWith('/uploads') ? `${BACKEND_BASE_URL}${pic}` : pic;
                      }
                      return (
                        <div className="home-voc-img-cell" key={idx}>
                          <img src={imgSrc} alt={voc.title + ' ' + (idx+1)} className="home-vocational-img" style={{objectFit: 'contain', width: '100%', height: '100%', maxHeight: '140px', maxWidth: '100%'}} onError={e => {e.target.onerror=null; e.target.src=fallbackImg;}} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="home-vocational-loading">No vocationals found.</div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Home; 