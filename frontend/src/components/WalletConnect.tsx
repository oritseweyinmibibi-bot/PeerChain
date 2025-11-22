import React from 'react';
import { useConnect } from '@stacks/connect-react';

export const WalletConnect: React.FC = () => {
  const { doOpenAuth } = useConnect();

  return (
    <div style={{
      textAlign: 'center',
      padding: '4rem 2rem',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      borderRadius: '20px',
      margin: '2rem auto',
      maxWidth: '700px',
      border: '1px solid #00a6fb',
      boxShadow: '0 8px 32px rgba(0, 166, 251, 0.2)'
    }}>
      <div style={{
        fontSize: '5rem',
        marginBottom: '1.5rem',
        filter: 'drop-shadow(0 0 20px rgba(0, 166, 251, 0.3))'
      }}>
        🎓
      </div>
      <h2 style={{
        color: '#00a6fb',
        marginBottom: '1rem',
        fontSize: '2.5rem'
      }}>
        Connect Your Academic Wallet
      </h2>
      <p style={{
        color: '#ccc',
        marginBottom: '2rem',
        lineHeight: '1.7',
        fontSize: '1.1rem',
        maxWidth: '500px',
        marginLeft: 'auto',
        marginRight: 'auto'
      }}>
        Join the future of academic publishing. Connect your Stacks wallet to publish research papers,
        participate in peer review, earn reputation tokens, and contribute to decentralized science.
      </p>
      <button
        onClick={() => doOpenAuth()}
        style={{
          background: 'linear-gradient(45deg, #00a6fb, #4fc3f7)',
          color: '#000',
          border: 'none',
          padding: '1.2rem 3rem',
          borderRadius: '15px',
          fontSize: '1.3rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 15px rgba(0, 166, 251, 0.3)',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '1rem'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 166, 251, 0.5)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 166, 251, 0.3)';
        }}
      >
        🔐 Connect Academic Wallet
      </button>
      <div style={{
        color: '#888',
        marginTop: '2rem',
        fontSize: '0.9rem'
      }}>
        <p style={{ margin: '0.5rem 0' }}>✨ <strong>Publish:</strong> Share your research globally</p>
        <p style={{ margin: '0.5rem 0' }}>🔍 <strong>Review:</strong> Earn tokens through quality peer review</p>
        <p style={{ margin: '0.5rem 0' }}>🏆 <strong>Earn:</strong> Build reputation and get rewarded</p>
        <p style={{ margin: '0.5rem 0' }}>🌐 <strong>Collaborate:</strong> Connect with researchers worldwide</p>
      </div>
    </div>
  );
};
