import React, { useState } from 'react';
import { UserSession } from '@stacks/connect';

interface Publication {
  id: number;
  author: string;
  title: string;
  doi: string;
  ipfsHash: string;
  timestamp: number;
  citations: number;
  totalRewards: number;
  status: string;
}

interface PublicationCardProps {
  publication: Publication;
  userSession: UserSession;
  onReview: () => void;
  onUpdate: () => void;
}

export const PublicationCard: React.FC<PublicationCardProps> = ({
  publication,
  userSession,
  onReview,
  onUpdate
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return '#4caf50';
      case 'rejected': return '#f44336';
      case 'reviewed': return '#2196f3';
      default: return '#ff9800';
    }
  };

  return (
    <div className="publication-card">
      <div className="publication-header">
        <div style={{ flex: 1 }}>
          <h3 className="publication-title">{publication.title}</h3>
          <div className="publication-meta">
            <span>By {formatAddress(publication.author)}</span>
            <span className="status-badge" style={{ background: getStatusColor(publication.status) }}>
              {publication.status.charAt(0).toUpperCase() + publication.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
        margin: '1rem 0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00a6fb' }}>
            {publication.citations}
          </div>
          <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Citations</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00a6fb' }}>
            {publication.totalRewards} PEER
          </div>
          <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Rewards Earned</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00a6fb' }}>
            {formatDate(publication.timestamp)}
          </div>
          <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Published</div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: '1rem',
        marginTop: '1.5rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="btn-secondary"
          style={{ padding: '0.5rem 1rem' }}
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>

        {publication.status === 'pending' && (
          <button
            onClick={onReview}
            className="btn-primary"
            style={{ padding: '0.5rem 1rem' }}
          >
            🔍 Review Paper
          </button>
        )}

        <button
          className="btn-academic"
          style={{ padding: '0.5rem 1rem' }}
        >
          📚 Cite Paper
        </button>
      </div>

      {showDetails && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: '#1a1a1a',
          borderRadius: '8px',
          fontSize: '0.9rem'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <strong style={{ color: '#00a6fb' }}>DOI:</strong>
            <span style={{ marginLeft: '0.5rem', fontFamily: 'monospace' }}>
              {publication.doi}
            </span>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <strong style={{ color: '#00a6fb' }}>IPFS Hash:</strong>
            <span style={{ marginLeft: '0.5rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {publication.ipfsHash}
            </span>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <strong style={{ color: '#00a6fb' }}>Author Address:</strong>
            <span style={{ marginLeft: '0.5rem', fontFamily: 'monospace' }}>
              {publication.author}
            </span>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid #333'
          }}>
            <span style={{ color: '#888' }}>
              Paper ID: #{publication.id}
            </span>
            <div>
              <button
                style={{
                  background: '#333',
                  color: '#00a6fb',
                  border: '1px solid #00a6fb',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  marginLeft: '0.5rem'
                }}
              >
                View on IPFS
              </button>
              <button
                style={{
                  background: '#333',
                  color: '#4fc3f7',
                  border: '1px solid #4fc3f7',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  marginLeft: '0.5rem'
                }}
              >
                View DOI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
