import React from 'react';

export const Header: React.FC = () => {
  return (
    <header style={{
      padding: '2rem 0',
      borderBottom: '1px solid #333',
      marginBottom: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: '3.5rem',
        marginBottom: '1rem'
      }}>
        📚
      </div>
      <h1 style={{
        margin: 0,
        color: '#00a6fb',
        fontSize: '3rem',
        fontWeight: 'bold',
        textShadow: '0 0 20px rgba(0, 166, 251, 0.3)',
        background: 'linear-gradient(45deg, #00a6fb, #4fc3f7)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        PeerChain
      </h1>
      <p style={{
        margin: '0.5rem 0 1rem 0',
        color: '#ccc',
        fontSize: '1.2rem',
        maxWidth: '600px',
        marginLeft: 'auto',
        marginRight: 'auto'
      }}>
        Decentralized Research Publication Network with AI-Powered Peer Review
      </p>
      <div className="academic-wave" style={{
        width: '300px',
        margin: '1rem auto',
        borderRadius: '25px'
      }}></div>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '2rem',
        marginTop: '1rem',
        fontSize: '0.9rem',
        color: '#888'
      }}>
        <span>🔒 Secure</span>
        <span>📊 Transparent</span>
        <span>🎯 Incentivized</span>
        <span>🤝 Collaborative</span>
      </div>
    </header>
  );
};
