import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const address1 = accounts.get("wallet_1")!;
const address2 = accounts.get("wallet_2")!;
const address3 = accounts.get("wallet_3")!;

describe("PeerChain Security Tests", () => {
  beforeEach(() => {
    simnet.mineEmptyBlock();
  });

  describe("Contract Initialization", () => {
    it("ensures simnet is well initialized", () => {
      expect(simnet.blockHeight).toBeDefined();
    });

    it("should have correct initial state", () => {
      const { result: isPaused } = simnet.callReadOnlyFn("PeerChaincontract", "is-contract-paused", [], deployer);
      expect(isPaused).toBeBool(false);

      const { result: stats } = simnet.callReadOnlyFn("PeerChaincontract", "get-contract-stats", [], deployer);
      expect(stats).toBeTuple({
        "total-papers": Cl.uint(0),
        "total-reviews": Cl.uint(0),
        "total-citations": Cl.uint(0),
        "total-supply": Cl.uint(0)
      });
    });
  });

  describe("Pause/Unpause Security", () => {
    it("should allow owner to pause contract", () => {
      const { result } = simnet.callPublicFn("PeerChaincontract", "pause-contract", [], deployer);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should prevent non-owner from pausing", () => {
      const { result } = simnet.callPublicFn("PeerChaincontract", "pause-contract", [], address1);
      expect(result).toBeErr(Cl.uint(100)); // ERR_NOT_AUTHORIZED
    });

    it("should block operations when paused", () => {
      simnet.callPublicFn("PeerChaincontract", "pause-contract", [], deployer);
      
      const { result } = simnet.callPublicFn("PeerChaincontract", "publish-paper", [
        Cl.stringUtf8("Test Paper"),
        Cl.stringAscii("10.1234/test"),
        Cl.stringAscii("QmTest123")
      ], address1);
      expect(result).toBeErr(Cl.uint(109)); // ERR_CONTRACT_PAUSED
    });

    it("should allow owner to unpause", () => {
      simnet.callPublicFn("PeerChaincontract", "pause-contract", [], deployer);
      const { result } = simnet.callPublicFn("PeerChaincontract", "unpause-contract", [], deployer);
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  describe("Input Validation", () => {
    it("should reject empty title", () => {
      const { result } = simnet.callPublicFn("PeerChaincontract", "publish-paper", [
        Cl.stringUtf8(""),
        Cl.stringAscii("10.1234/test"),
        Cl.stringAscii("QmTest123")
      ], address1);
      expect(result).toBeErr(Cl.uint(111)); // ERR_INVALID_INPUT
    });

    it("should reject empty DOI", () => {
      const { result } = simnet.callPublicFn("PeerChaincontract", "publish-paper", [
        Cl.stringUtf8("Test Paper"),
        Cl.stringAscii(""),
        Cl.stringAscii("QmTest123")
      ], address1);
      expect(result).toBeErr(Cl.uint(111)); // ERR_INVALID_INPUT
    });

    it("should reject empty IPFS hash", () => {
      const { result } = simnet.callPublicFn("PeerChaincontract", "publish-paper", [
        Cl.stringUtf8("Test Paper"),
        Cl.stringAscii("10.1234/test"),
        Cl.stringAscii("")
      ], address1);
      expect(result).toBeErr(Cl.uint(111)); // ERR_INVALID_INPUT
    });
  });

  describe("Rate Limiting", () => {
    it("should allow up to 5 operations per block", () => {
      for (let i = 1; i <= 5; i++) {
        const result = simnet.callPublicFn("PeerChaincontract", "publish-paper", [
          Cl.stringUtf8(`Paper ${i}`),
          Cl.stringAscii(`10.1234/test${i}`),
          Cl.stringAscii(`QmTest${i}`)
        ], address1);
        expect(result.result).toBeOk(Cl.uint(i));
      }
    });

    it("should track last operation block", () => {
      simnet.callPublicFn("PeerChaincontract", "publish-paper", [
        Cl.stringUtf8("Test Paper"),
        Cl.stringAscii("10.1234/test"),
        Cl.stringAscii("QmTest123")
      ], address2);

      const { result } = simnet.callReadOnlyFn("PeerChaincontract", "get-last-operation-block", [Cl.standardPrincipal(address2)], deployer);
      expect(result).toBeDefined();
    });
  });

  describe("Self-Review Prevention", () => {
    it("should prevent authors from reviewing their own papers", () => {
      // Publish paper
      simnet.callPublicFn("PeerChaincontract", "publish-paper", [
        Cl.stringUtf8("My Paper"),
        Cl.stringAscii("10.1234/mine"),
        Cl.stringAscii("QmMyPaper")
      ], address1);

      simnet.mineEmptyBlock();

      // Mint tokens for review
      simnet.callPublicFn("PeerChaincontract", "mint-tokens", [Cl.uint(10000000)], deployer);
      simnet.callPublicFn("PeerChaincontract", "transfer", [
        Cl.uint(2000000),
        Cl.standardPrincipal(deployer),
        Cl.standardPrincipal(address1),
        Cl.none()
      ], deployer);

      simnet.mineEmptyBlock();

      // Try to review own paper
      const { result } = simnet.callPublicFn("PeerChaincontract", "submit-review", [
        Cl.uint(1),
        Cl.stringAscii("QmReview123"),
        Cl.uint(1000000)
      ], address1);
      expect(result).toBeErr(Cl.uint(113)); // ERR_SELF_REVIEW
    });
  });

  describe("Duplicate Review Prevention", () => {
    it("should prevent same reviewer from reviewing same paper twice", () => {
      // Publish paper
      simnet.callPublicFn("PeerChaincontract", "publish-paper", [
        Cl.stringUtf8("Research Paper"),
        Cl.stringAscii("10.1234/research"),
        Cl.stringAscii("QmResearch")
      ], address1);

      simnet.mineEmptyBlock();

      // Mint and distribute tokens
      simnet.callPublicFn("PeerChaincontract", "mint-tokens", [Cl.uint(10000000)], deployer);
      simnet.callPublicFn("PeerChaincontract", "transfer", [
        Cl.uint(3000000),
        Cl.standardPrincipal(deployer),
        Cl.standardPrincipal(address2),
        Cl.none()
      ], deployer);

      simnet.mineEmptyBlock();

      // First review
      const result1 = simnet.callPublicFn("PeerChaincontract", "submit-review", [
        Cl.uint(1),
        Cl.stringAscii("QmReview1"),
        Cl.uint(1000000)
      ], address2);
      expect(result1.result).toBeOk(Cl.uint(1));

      simnet.mineEmptyBlock();

      // Try second review of same paper
      const result2 = simnet.callPublicFn("PeerChaincontract", "submit-review", [
        Cl.uint(1),
        Cl.stringAscii("QmReview2"),
        Cl.uint(1000000)
      ], address2);
      expect(result2.result).toBeErr(Cl.uint(114)); // ERR_DUPLICATE_REVIEW
    });
  });

  describe("Citation Security", () => {
    it("should prevent self-citation", () => {
      // Publish paper
      simnet.callPublicFn("PeerChaincontract", "publish-paper", [
        Cl.stringUtf8("Paper A"),
        Cl.stringAscii("10.1234/a"),
        Cl.stringAscii("QmPaperA")
      ], address1);

      simnet.mineEmptyBlock();

      // Try to cite itself
      const { result } = simnet.callPublicFn("PeerChaincontract", "add-citation", [
        Cl.uint(1),
        Cl.uint(1)
      ], address1);
      expect(result).toBeErr(Cl.uint(108)); // ERR_INVALID_CITATION
    });

    it("should only allow citing paper author to add citation", () => {
      // Publish two papers
      simnet.callPublicFn("PeerChaincontract", "publish-paper", [
        Cl.stringUtf8("Paper A"),
        Cl.stringAscii("10.1234/a"),
        Cl.stringAscii("QmPaperA")
      ], address1);

      simnet.mineEmptyBlock();

      simnet.callPublicFn("PeerChaincontract", "publish-paper", [
        Cl.stringUtf8("Paper B"),
        Cl.stringAscii("10.1234/b"),
        Cl.stringAscii("QmPaperB")
      ], address2);

      simnet.mineEmptyBlock();

      // Try to add citation from wrong account
      const { result } = simnet.callPublicFn("PeerChaincontract", "add-citation", [
        Cl.uint(1),
        Cl.uint(2)
      ], address3);
      expect(result).toBeErr(Cl.uint(100)); // ERR_NOT_AUTHORIZED
    });
  });

  describe("Reviewer Cannot Vote on Own Review", () => {
    it("should prevent reviewers from voting on their own reviews", () => {
      // Setup: publish paper, mint tokens, submit review
      simnet.callPublicFn("PeerChaincontract", "publish-paper", [
        Cl.stringUtf8("Test Paper"),
        Cl.stringAscii("10.1234/test"),
        Cl.stringAscii("QmTest")
      ], address1);

      simnet.mineEmptyBlock();

      simnet.callPublicFn("PeerChaincontract", "mint-tokens", [Cl.uint(10000000)], deployer);
      simnet.callPublicFn("PeerChaincontract", "transfer", [
        Cl.uint(2000000),
        Cl.standardPrincipal(deployer),
        Cl.standardPrincipal(address2),
        Cl.none()
      ], deployer);

      simnet.mineEmptyBlock();

      simnet.callPublicFn("PeerChaincontract", "submit-review", [
        Cl.uint(1),
        Cl.stringAscii("QmReview"),
        Cl.uint(1000000)
      ], address2);

      simnet.mineEmptyBlock();

      // Try to vote on own review
      const { result } = simnet.callPublicFn("PeerChaincontract", "vote-on-review", [
        Cl.uint(1),
        Cl.bool(true)
      ], address2);
      expect(result).toBeErr(Cl.uint(111)); // ERR_INVALID_INPUT
    });
  });

  describe("Read-Only Security Functions", () => {
    it("should check if paper has been reviewed by user", () => {
      // Publish and review
      simnet.callPublicFn("PeerChaincontract", "publish-paper", [
        Cl.stringUtf8("Paper"),
        Cl.stringAscii("10.1234/p"),
        Cl.stringAscii("QmP")
      ], address1);

      simnet.mineEmptyBlock();

      simnet.callPublicFn("PeerChaincontract", "mint-tokens", [Cl.uint(10000000)], deployer);
      simnet.callPublicFn("PeerChaincontract", "transfer", [
        Cl.uint(2000000),
        Cl.standardPrincipal(deployer),
        Cl.standardPrincipal(address2),
        Cl.none()
      ], deployer);

      simnet.mineEmptyBlock();

      simnet.callPublicFn("PeerChaincontract", "submit-review", [
        Cl.uint(1),
        Cl.stringAscii("QmR"),
        Cl.uint(1000000)
      ], address2);

      const { result } = simnet.callReadOnlyFn("PeerChaincontract", "has-reviewed-paper", [
        Cl.uint(1),
        Cl.standardPrincipal(address2)
      ], deployer);
      expect(result).toBeBool(true);
    });

    it("should get paper author", () => {
      simnet.callPublicFn("PeerChaincontract", "publish-paper", [
        Cl.stringUtf8("Paper"),
        Cl.stringAscii("10.1234/p"),
        Cl.stringAscii("QmP")
      ], address1);

      const { result } = simnet.callReadOnlyFn("PeerChaincontract", "get-paper-author", [Cl.uint(1)], deployer);
      expect(result).toBeSome(Cl.standardPrincipal(address1));
    });
  });

  describe("Journal DAO Security", () => {
    it("should prevent duplicate journal DAO names", () => {
      const result1 = simnet.callPublicFn("PeerChaincontract", "create-journal-dao", [
        Cl.stringAscii("Nature"),
        Cl.stringUtf8("Biology"),
        Cl.uint(1000000)
      ], address1);
      expect(result1.result).toBeOk(Cl.bool(true));

      simnet.mineEmptyBlock();

      const result2 = simnet.callPublicFn("PeerChaincontract", "create-journal-dao", [
        Cl.stringAscii("Nature"),
        Cl.stringUtf8("Physics"),
        Cl.uint(2000000)
      ], address2);
      expect(result2.result).toBeErr(Cl.uint(111)); // ERR_INVALID_INPUT
    });

    it("should reject zero min-stake", () => {
      const { result } = simnet.callPublicFn("PeerChaincontract", "create-journal-dao", [
        Cl.stringAscii("Science"),
        Cl.stringUtf8("Chemistry"),
        Cl.uint(0)
      ], address1);
      expect(result).toBeErr(Cl.uint(115)); // ERR_INVALID_AMOUNT
    });
  });
});
