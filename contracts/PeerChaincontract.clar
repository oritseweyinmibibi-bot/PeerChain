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


;; public functions

;; Mint initial tokens to contract owner for distribution
(define-public (mint-tokens (amount uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
    (ft-mint? peer-token amount tx-sender)
  )
)

;; Publish a research paper
(define-public (publish-paper (title (string-utf8 256)) (doi (string-ascii 128)) (ipfs-hash (string-ascii 64)))
  (let ((paper-id (var-get next-paper-id)))
    (try! (nft-mint? research-paper paper-id tx-sender))
    (map-set papers paper-id {
      author: tx-sender,
      title: title,
      doi: doi,
      ipfs-hash: ipfs-hash,
      timestamp: block-height,
      citations: u0,
      total-rewards: u0,
      status: "pending"
    })
    (var-set next-paper-id (+ paper-id u1))
    (ok paper-id)
  )
)

;; Submit a peer review with staking
(define-public (submit-review (paper-id uint) (content-hash (string-ascii 64)) (stake-amount uint))
  (let (
    (review-id (var-get next-review-id))
    (reviewer-data (default-to {total-reviews: u0, quality-score: u0, tokens-earned: u0, tokens-staked: u0} 
                               (map-get? reviewer-reputation tx-sender)))
  )
    (asserts! (>= stake-amount MIN_REVIEW_STAKE) ERR_INSUFFICIENT_STAKE)
    (asserts! (is-some (map-get? papers paper-id)) ERR_PAPER_NOT_FOUND)
    (asserts! (>= (unwrap-panic (ft-get-balance peer-token tx-sender)) stake-amount) ERR_INSUFFICIENT_BALANCE)
    
    ;; Transfer stake to contract
    (try! (ft-transfer? peer-token stake-amount tx-sender (as-contract tx-sender)))
    
    ;; Create review
    (map-set reviews review-id {
      paper-id: paper-id,
      reviewer: tx-sender,
      stake: stake-amount,
      content-hash: content-hash,
      timestamp: block-height,
      quality-score: u0,
      votes-for: u0,
      votes-against: u0,
      voting-ends: (+ block-height REVIEW_PERIOD)
    })
    
    ;; Add to paper reviews list
    (map-set paper-reviews paper-id 
      (unwrap-panic (as-max-len? 
        (append (default-to (list) (map-get? paper-reviews paper-id)) review-id) 
        u10)))
    
    ;; Update reviewer reputation
    (map-set reviewer-reputation tx-sender 
      (merge reviewer-data {
        total-reviews: (+ (get total-reviews reviewer-data) u1),
        tokens-staked: (+ (get tokens-staked reviewer-data) stake-amount)
      }))
    
    (var-set next-review-id (+ review-id u1))
    (ok review-id)
  )
)

;; Vote on review quality
(define-public (vote-on-review (review-id uint) (is-quality bool))
  (let ((review-data (unwrap! (map-get? reviews review-id) ERR_REVIEW_NOT_FOUND)))
    (asserts! (<= block-height (get voting-ends review-data)) ERR_VOTING_ENDED)
    (asserts! (is-none (map-get? review-votes {review-id: review-id, voter: tx-sender})) ERR_ALREADY_VOTED)
    
    (map-set review-votes {review-id: review-id, voter: tx-sender} is-quality)
    
    (if is-quality
      (map-set reviews review-id 
        (merge review-data {votes-for: (+ (get votes-for review-data) u1)}))
      (map-set reviews review-id 
        (merge review-data {votes-against: (+ (get votes-against review-data) u1)}))
    )
    
    (ok true)
  )
)

;; Finalize review and distribute rewards
(define-public (finalize-review (review-id uint))
  (let (
    (review-data (unwrap! (map-get? reviews review-id) ERR_REVIEW_NOT_FOUND))
    (reviewer (get reviewer review-data))
    (stake (get stake review-data))
    (votes-for (get votes-for review-data))
    (votes-against (get votes-against review-data))
    (quality-threshold (/ (+ votes-for votes-against) u2))
  )
    (asserts! (> block-height (get voting-ends review-data)) ERR_VOTING_ENDED)
    
    (if (> votes-for quality-threshold)
      ;; Quality review - return stake + bonus
      (begin
        (try! (as-contract (ft-transfer? peer-token (+ stake QUALITY_BONUS) tx-sender reviewer)))
        (update-reviewer-reputation reviewer true QUALITY_BONUS)
        (ok true)
      )
      ;; Poor quality review - forfeit half of stake
      (begin
        (try! (as-contract (ft-transfer? peer-token (/ stake u2) tx-sender reviewer)))
        (update-reviewer-reputation reviewer false u0)
        (ok false)
      )
    )
  )
)

;; Record a citation and reward author
(define-public (add-citation (paper-id uint) (citing-paper-id uint))
  (let ((paper-data (unwrap! (map-get? papers paper-id) ERR_PAPER_NOT_FOUND)))
    (asserts! (is-some (map-get? papers citing-paper-id)) ERR_INVALID_CITATION)
    (asserts! (is-none (map-get? citations {paper-id: paper-id, citing-paper: citing-paper-id})) ERR_INVALID_CITATION)
    
    ;; Record citation
    (map-set citations {paper-id: paper-id, citing-paper: citing-paper-id} {
      timestamp: block-height,
      verified: true
    })
    
    ;; Update paper citation count and reward author
    (map-set papers paper-id 
      (merge paper-data {
        citations: (+ (get citations paper-data) u1),
        total-rewards: (+ (get total-rewards paper-data) CITATION_REWARD)
      }))
    
    ;; Transfer citation reward to paper author
    (try! (as-contract (ft-transfer? peer-token CITATION_REWARD tx-sender (get author paper-data))))
    
    (var-set total-citations (+ (var-get total-citations) u1))
    (ok true)
  )
)

;; Create a journal DAO
(define-public (create-journal-dao (name (string-ascii 64)) (specialty (string-utf8 128)) (min-stake uint))
  (begin
    (map-set journal-daos name {
      admin: tx-sender,
      members: (list tx-sender),
      specialty: specialty,
      min-stake: min-stake
    })
    (ok true)
  )
)

;; read only functions

;; Get paper details
(define-read-only (get-paper (paper-id uint))
  (map-get? papers paper-id)
)

;; Get review details
(define-read-only (get-review (review-id uint))
  (map-get? reviews review-id)
)

;; Get reviewer reputation
(define-read-only (get-reviewer-reputation (reviewer principal))
  (map-get? reviewer-reputation reviewer)
)

;; Get paper reviews
(define-read-only (get-paper-reviews (paper-id uint))
  (map-get? paper-reviews paper-id)
)

;; Get total supply of tokens
(define-read-only (get-total-supply)
  (ok (ft-get-supply peer-token))
)

;; Get token balance
(define-read-only (get-balance (owner principal))
  (ok (ft-get-balance peer-token owner))
)

;; Get citation info
(define-read-only (get-citation (paper-id uint) (citing-paper-id uint))
  (map-get? citations {paper-id: paper-id, citing-paper: citing-paper-id})
)

;; Get journal DAO info
(define-read-only (get-journal-dao (name (string-ascii 64)))
  (map-get? journal-daos name)
)

;; Get contract stats
(define-read-only (get-contract-stats)
  {
    total-papers: (- (var-get next-paper-id) u1),
    total-reviews: (- (var-get next-review-id) u1),
    total-citations: (var-get total-citations),
    total-supply: (ft-get-supply peer-token)
  }
)

;; private functions

;; Update reviewer reputation after review finalization
(define-private (update-reviewer-reputation (reviewer principal) (was-quality bool) (bonus uint))
  (let ((current-rep (default-to {total-reviews: u0, quality-score: u0, tokens-earned: u0, tokens-staked: u0} 
                                 (map-get? reviewer-reputation reviewer))))
    (map-set reviewer-reputation reviewer 
      (merge current-rep {
        quality-score: (if was-quality 
                          (+ (get quality-score current-rep) u1) 
                          (get quality-score current-rep)),
        tokens-earned: (+ (get tokens-earned current-rep) bonus)
      }))
  )
)

;; SIP-010 Token Standard Implementation
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) ERR_NOT_AUTHORIZED)
    (ft-transfer? peer-token amount sender recipient)
  )
)

(define-read-only (get-name)
  (ok "PeerChain Token")
)

(define-read-only (get-symbol)
  (ok "PEER")
)

(define-read-only (get-decimals)
  (ok u6)
)

(define-read-only (get-token-uri (token-id uint))
  (ok none)
)