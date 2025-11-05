import React from 'react';
import { FaRocket, FaCoins, FaFire, FaCheckCircle } from 'react-icons/fa';

interface LandingPageProps {
  setActiveTab: (tab: 'chains' | 'create' | 'manage' | 'verify' | 'history' | 'landing') => void;
  setCardClass: (className: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ setActiveTab, setCardClass }) => {

  const handleNavClick = (tab: 'create' | 'manage' | 'verify') => {
    setActiveTab(tab);
    setCardClass('ux-card-enter');
    requestAnimationFrame(() => setCardClass('ux-card-enter ux-card-enter-active'));
  };

  const steps = [
    {
      title: 'Create Your Token',
      description: 'Define the properties of your new SPL token, including its name, symbol, and initial supply.',
      tab: 'create',
      buttonText: 'Start Creating',
      icon: <FaRocket size={36} color="#14f195" />
    },
    {
      title: 'Mint More Tokens',
      description: 'Increase the total supply of your token by minting new ones.',
      tab: 'manage',
      buttonText: 'Mint Tokens',
      icon: <FaCoins size={36} color="#14f195" />
    },
    {
      title: 'Burn Tokens',
      description: 'Reduce the total supply of your token by burning them.',
      tab: 'manage',
      buttonText: 'Burn Tokens',
      icon: <FaFire size={36} color="#14f195" />
    },
    {
      title: 'Verify & Track',
      description: 'Verify token details and view a complete history of all your transactions on the network.',
      tab: 'verify',
      buttonText: 'Verify Token',
      icon: <FaCheckCircle size={36} color="#14f195" />
    }
  ];

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero">
        <h1 className="hero-title">SPL Token Manager</h1>
        <p className="hero-tagline">Create, manage, and track your SPL tokens on Solana with ease.</p>
        <button className="hero-cta ux-button" onClick={() => handleNavClick('create')}>Get Started</button>
      </section>

      {/* Steps as Cards */}
      <section className="steps-section">
        <h2 className="steps-title">How It Works</h2>
        <div className="steps-list">
          {steps.map((step, idx) => (
            <div className="step-card" key={idx}>
              <div className="step-icon">{step.icon}</div>
              <h4 className="step-title">{step.title}</h4>
              <p className="step-desc">{step.description}</p>
              <button
                onClick={() => handleNavClick(step.tab as 'create' | 'manage' | 'verify')}
                className="ux-button step-action"
              >
                {step.buttonText}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;

