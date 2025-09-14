;; title: PeerChain - Decentralized Research Publication Network
;; version: 1.0.0
;; summary: Smart contract for decentralized academic publishing with peer review and tokenized incentives
;; description: Enables researchers to publish papers as NFTs, conduct peer reviews with staking,
;;              and earn rewards through citations and quality reviews

;; traits
(define-trait sip-010-trait
  (
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))
    (get-name () (response (string-ascii 32) uint))
    (get-symbol () (response (string-ascii 32) uint))
    (get-decimals () (response uint uint))
    (get-balance (principal) (response uint uint))
    (get-total-supply () (response uint uint))
    (get-token-uri (uint) (response (optional (string-utf8 256)) uint))
  )
)

;; token definitions
(define-fungible-token peer-token)
(define-non-fungible-token research-paper uint)

;; constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_NOT_AUTHORIZED (err u100))
(define-constant ERR_PAPER_NOT_FOUND (err u101))
(define-constant ERR_ALREADY_REVIEWED (err u102))
(define-constant ERR_INSUFFICIENT_STAKE (err u103))
(define-constant ERR_REVIEW_NOT_FOUND (err u104))
(define-constant ERR_VOTING_ENDED (err u105))
(define-constant ERR_ALREADY_VOTED (err u106))
(define-constant ERR_INSUFFICIENT_BALANCE (err u107))
(define-constant ERR_INVALID_CITATION (err u108))

(define-constant MIN_REVIEW_STAKE u1000000) ;; 1 token with 6 decimals
(define-constant REVIEW_PERIOD u1440) ;; 1440 blocks (~10 days)
(define-constant CITATION_REWARD u100000) ;; 0.1 token reward per citation
(define-constant QUALITY_BONUS u500000) ;; 0.5 token bonus for quality reviews

;; data vars
(define-data-var next-paper-id uint u1)
(define-data-var next-review-id uint u1)
(define-data-var total-citations uint u0)

;; data maps
(define-map papers uint {
  author: principal,
  title: (string-utf8 256),
  doi: (string-ascii 128),
  ipfs-hash: (string-ascii 64),
  timestamp: uint,
  citations: uint,
  total-rewards: uint,
  status: (string-ascii 20) ;; "pending", "reviewed", "accepted", "rejected"
})

(define-map reviews uint {
  paper-id: uint,
  reviewer: principal,
  stake: uint,
  content-hash: (string-ascii 64),
  timestamp: uint,
  quality-score: uint,
  votes-for: uint,
  votes-against: uint,
  voting-ends: uint
})

(define-map paper-reviews uint (list 10 uint)) ;; paper-id -> list of review-ids

(define-map reviewer-reputation principal {
  total-reviews: uint,
  quality-score: uint,
  tokens-earned: uint,
  tokens-staked: uint
})

(define-map citations {paper-id: uint, citing-paper: uint} {
  timestamp: uint,
  verified: bool
})

(define-map review-votes {review-id: uint, voter: principal} bool) ;; true for quality, false for poor

(define-map journal-daos (string-ascii 64) {
  admin: principal,
  members: (list 50 principal),
  specialty: (string-utf8 128),
  min-stake: uint
})
