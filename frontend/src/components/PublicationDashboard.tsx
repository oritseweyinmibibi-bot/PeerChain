import React, { useState, useEffect } from 'react';
import { UserSession } from '@stacks/connect';
import { StacksMainnet } from '@stacks/network';
import { callReadOnlyFunction, cvToJSON } from '@stacks/transactions';
import { PublicationCard } from './PublicationCard';
import { PublishPaperForm } from './PublishPaperForm';
import { ReviewInterface } from './ReviewInterface';

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

interface DashboardStats {
  totalPapers: number;
  totalReviews: number;
  totalCitations: number;
  totalSupply: number;
}

interface PublicationDashboardProps {
  userSession: UserSession;
}

export const PublicationDashboard: React.FC<PublicationDashboardProps> = ({ userSession }) => {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalPapers: 0,
    totalReviews: 0,
    totalCitations: 0,
    totalSupply: 0
  });
  const [loading, setLoading] = useState(true);
  const [showPublishForm, setShowPublishForm] = useState(false);
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
  const [activeTab, setActiveTab] = useState<'publications' | 'reviews' | 'citations'>('publications');

  const network = new StacksMainnet();
  const contractAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Replace with actual contract address
  const contractName = 'PeerChaincontract';

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load stats
      const statsResult = await callReadOnlyFunction({
        network,
        contractAddress,
        contractName,
        functionName: 'get-contract-stats',
        functionArgs: [],
        senderAddress: userSession.loadUserData().profile.stxAddress.mainnet,
      });

      const statsData = cvToJSON(statsResult).value.value;
      setStats({
        totalPapers: statsData['total-papers'].value,
        totalReviews: statsData['total-reviews'].value,
        totalCitations: statsData['total-citations'].value,
        totalSupply: statsData['total-supply'].value,
      });

      // Load publications (simplified - in real implementation, you'd iterate through all papers)
      setPublications([]);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublicationPublished = () => {
    setShowPublishForm(false);
    loadDashboardData();
  };

  const handleReviewPublication = (publication: Publication) => {
    setSelectedPublication(publication);
  };

  if (loading) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '3rem',
        color: '#00a6fb'
      }}>
        <div className="loading-spinner"></div>
        Loading academic publications...
      </div>
    );
  }

  return (
    <div>
      {/* Stats Dashboard */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.totalPapers}</div>
          <div className="stat-label">Research Papers</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalReviews}</div>
          <div className="stat-label">Peer Reviews</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalCitations}</div>
          <div className="stat-label">Citations</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalSupply} PEER</div>
          <div className="stat-label">Tokens Minted</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '2rem',
        borderBottom: '1px solid #333'
      }}>
        {[
          { id: 'publications', label: '📄 Publications', count: stats.totalPapers },
          { id: 'reviews', label: '🔍 Reviews', count: stats.totalReviews },
          { id: 'citations', label: '📚 Citations', count: stats.totalCitations }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: activeTab === tab.id ? 'linear-gradient(45deg, #00a6fb, #4fc3f7)' : 'transparent',
              color: activeTab === tab.id ? '#000' : '#ccc',
              border: 'none',
              padding: '1rem 2rem',
              cursor: 'pointer',
              fontWeight: 'bold',
              borderRadius: activeTab === tab.id ? '8px 8px 0 0' : '0',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{ color: '#00a6fb', margin: 0 }}>
            {activeTab === 'publications' && 'Research Publications'}
            {activeTab === 'reviews' && 'Peer Review System'}
            {activeTab === 'citations' && 'Citation Network'}
          </h2>
          <p style={{ color: '#ccc', margin: '0.5rem 0' }}>
            {activeTab === 'publications' && 'Publish and discover groundbreaking research'}
            {activeTab === 'reviews' && 'Contribute to scientific advancement through peer review'}
            {activeTab === 'citations' && 'Track the impact of research through citations'}
          </p>
        </div>

        {activeTab === 'publications' && (
          <button
            onClick={() => setShowPublishForm(!showPublishForm)}
            className="btn-academic"
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem'
            }}
          >
            {showPublishForm ? 'Cancel' : '📝 Publish New Paper'}
          </button>
        )}
      </div>

      {/* Publish Form */}
      {showPublishForm && activeTab === 'publications' && (
        <PublishPaperForm
          userSession={userSession}
          onPaperPublished={handlePublicationPublished}
        />
      )}

      {/* Review Interface */}
      {selectedPublication && (
        <ReviewInterface
          publication={selectedPublication}
          userSession={userSession}
          onClose={() => setSelectedPublication(null)}
          onReviewComplete={() => {
            setSelectedPublication(null);
            loadDashboardData();
          }}
        />
      )}

      {/* Publications List */}
      {activeTab === 'publications' && (
        <div>
          {publications.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: '16px',
              border: '1px solid #333',
              color: '#ccc'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📄</div>
              <h3 style={{ color: '#00a6fb', marginBottom: '1rem' }}>No publications yet</h3>
              <p style={{ marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem auto' }}>
                Be the first to publish groundbreaking research on PeerChain.
                Share your discoveries with the global academic community and earn reputation tokens.
              </p>
              <button
                onClick={() => setShowPublishForm(true)}
                className="btn-primary"
                style={{
                  padding: '1rem 2rem',
                  fontSize: '1.1rem'
                }}
              >
                🎓 Publish Your Research
              </button>
            </div>
          ) : (
            publications.map((publication) => (
              <PublicationCard
                key={publication.id}
                publication={publication}
                userSession={userSession}
                onReview={() => handleReviewPublication(publication)}
                onUpdate={() => loadDashboardData()}
              />
            ))
          )}
        </div>
      )}

      {/* Placeholder for Reviews and Citations tabs */}
      {(activeTab === 'reviews' || activeTab === 'citations') && (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '16px',
          border: '1px solid #333',
          color: '#ccc'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
            {activeTab === 'reviews' ? '🔍' : '📚'}
          </div>
          <h3 style={{ color: '#00a6fb', marginBottom: '1rem' }}>
            {activeTab === 'reviews' ? 'Peer Review System' : 'Citation Network'}
          </h3>
          <p style={{ marginBottom: '2rem' }}>
            {activeTab === 'reviews'
              ? 'Advanced peer review interface with staking and reputation systems coming soon.'
              : 'Comprehensive citation tracking and impact metrics coming soon.'
            }
          </p>
          <div style={{
            background: '#2a2a2a',
            padding: '1rem',
            borderRadius: '8px',
            display: 'inline-block'
          }}>
            🚧 Under Development 🚧
          </div>
        </div>
      )}
    </div>
  );
};
