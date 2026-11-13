// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./VartulFixture.sol";

/// @notice Drives random sequences of network actions. Reverts are expected and tolerated:
/// the invariants must hold whatever subset of actions succeeds.
contract VartulHandler is VartulFixture {
    bytes32 public constant PID_KG = keccak256("PRG-INV-PERKG");
    bytes32 public constant PID_FIXED = keccak256("PRG-INV-FIXED");
    uint256[] public lotList;
    bytes32[2] public pids;

    constructor() {
        _deployNetwork();
        pids = [PID_KG, PID_FIXED];
        _openProgramme(_input(PID_KG, escrow.PER_KG_CAPPED(), 0, 18 ether, 15_000 ether, 6_240 ether, 1 hours));
        _openProgramme(_input(PID_FIXED, escrow.FIXED_ON_TARGET(), 3_000_000, 0, 20_000 ether, 10_000 ether, 1 hours));
    }

    // ----- Accessors for the invariant test -----

    function lotCount() external view returns (uint256) {
        return lotList.length;
    }

    function contracts() external view returns (SandboxINR, ProgrammeEscrow, PayoutRouter, VartulClaims, RecoveryLotRegistry, MaterialSettlement) {
        return (dinr, escrow, router, claims, lots, market);
    }

    function holders() external view returns (address[] memory h) {
        h = new address[](11);
        h[0] = orig;
        h[1] = verifier;
        h[2] = sponsorA;
        h[3] = sponsorB;
        h[4] = buyer;
        h[5] = saathi[0];
        h[6] = saathi[1];
        h[7] = saathi[2];
        h[8] = address(escrow);
        h[9] = address(router);
        h[10] = address(market);
    }

    // ----- Actions -----

    function mintAndVerify(uint256 seed, uint32 a, uint32 b, uint32 c, uint16 eligibleBps) external {
        vm.warp(block.timestamp + 1 hours);
        bytes32 pid = pids[seed % 2];
        bytes32 lotId = keccak256(abi.encode("inv-lot", lotList.length, seed));
        uint256[3] memory grams = [uint256(a % 900_000), uint256(b % 900_000), uint256(c % 900_000) + 1_000];
        uint256 input = grams[0] + grams[1] + grams[2];
        uint256 contamination = input / 20;
        uint256 aggregated = input - contamination;
        RecoveryLotRegistry.MintInput memory m = _mintInput(lotId, pid, grams, contamination, aggregated);
        Attestation memory w = _att(Kinds.AGGREGATION_WEIGH, lotId, aggregated, bytes32("root"));
        lots.mintLot(m, w, _sign(MRC_KEY, w));
        lotList.push(uint256(lotId));
        _dispatch(lotId);
        _receive(lotId, aggregated);
        _verify(lotId, aggregated * (eligibleBps % 10_001) / 10_000);
    }

    function finalize(uint256 i) external {
        if (lotList.length == 0) return;
        vm.warp(block.timestamp + 1 hours);
        lots.finalize(lotList[i % lotList.length]);
    }

    function challengeAndResolve(uint256 i, uint16 bps) external {
        if (lotList.length == 0) return;
        uint256 id = lotList[i % lotList.length];
        vm.prank(panchayat);
        lots.challenge(id, bytes32("query"));
        uint256 q = lots.getLot(id).receivedGrams * (bps % 10_001) / 10_000;
        Attestation memory r = _att(Kinds.RESOLUTION, bytes32(id), q, bytes32("resolved"));
        lots.resolveChallenge(id, r, _sign(VERIFIER_KEY, r));
    }

    function revokeAndReview(uint256 i, bool voidLot) external {
        if (lotList.length == 0) return;
        uint256 id = lotList[i % lotList.length];
        bytes32 receipt = lots.getLot(id).receiptAtt;
        vm.prank(facility);
        att.revoke(receipt, bytes32("recheck"));
        lots.markUnderReview(id);
        Attestation memory r = _att(Kinds.RESOLUTION, bytes32(id), 0, bytes32("review"));
        vm.prank(fac);
        lots.concludeReview(id, voidLot, r, _sign(FAC_KEY, r));
    }

    function sell(uint256 i, uint64 price) external {
        if (lotList.length == 0) return;
        uint256 id = lotList[i % lotList.length];
        uint256 p = 1 + uint256(price) % 10_000 ether;
        vm.prank(orig);
        uint256 offer = market.createOffer(id, buyer, p, uint64(block.timestamp + 1 days));
        vm.prank(buyer);
        dinr.approve(address(market), p);
        vm.prank(buyer);
        market.acceptOffer(offer);
    }

    function disputeAndAward(uint256 seed, uint64 amount) external {
        bytes32 pid = pids[seed % 2];
        vm.prank(sponsorB);
        escrow.dispute(pid, bytes32("dispute"));
        ProgrammeEscrow.Programme memory p = escrow.getProgramme(pid);
        uint256 q = uint256(amount) % (p.funded - p.paid + 1);
        Attestation memory w = _att(Kinds.ARBITRAL_AWARD, pid, q, bytes32("award"));
        escrow.resolveByAward(pid, w, _sign(FAC_KEY, w));
    }

    function exceptionSettle(uint256 seed, uint64 amount) external {
        bytes32 pid = pids[seed % 2];
        ProgrammeEscrow.Programme memory p = escrow.getProgramme(pid);
        uint256 q = uint256(amount) % (p.funded - p.paid + 1);
        vm.prank(orig);
        bytes32 h = escrow.proposeException(pid, 1, q, 0, bytes32("agreed"));
        vm.prank(sponsorA);
        escrow.approveException(pid, h);
        vm.prank(sponsorB);
        escrow.approveException(pid, h);
    }

    function expire(uint256 seed) external {
        vm.warp(block.timestamp + 30 days);
        escrow.expire(pids[seed % 2]);
    }
}

contract VartulInvariantTest {
    VartulHandler internal handler;
    uint256 internal initialSupply;

    function setUp() public {
        handler = new VartulHandler();
        (SandboxINR dinr,,,,,) = handler.contracts();
        initialSupply = dinr.totalSupply();
    }

    function targetContracts() public view returns (address[] memory t) {
        t = new address[](1);
        t[0] = address(handler);
    }

    /// Money is neither created nor lost, and never leaves the set of registered holders.
    function invariant_moneyIsConserved() public view {
        (SandboxINR dinr,,,,,) = handler.contracts();
        address[] memory h = handler.holders();
        uint256 sum;
        for (uint256 i = 0; i < h.length; i++) sum += dinr.balanceOf(h[i]);
        require(dinr.totalSupply() == initialSupply, "supply changed");
        require(sum == initialSupply, "money outside registered holders");
    }

    /// The escrow holds exactly the unspent, unrefunded funds of every programme.
    function invariant_escrowMatchesProgrammeBooks() public view {
        (SandboxINR dinr, ProgrammeEscrow escrow, PayoutRouter router,,,) = handler.contracts();
        uint256 owed;
        for (uint256 i = 0; i < 2; i++) {
            ProgrammeEscrow.Programme memory p = escrow.getProgramme(handler.pids(i));
            require(p.paid + p.refunded <= p.funded, "over-disbursed");
            owed += p.funded - p.paid - p.refunded;
        }
        require(dinr.balanceOf(address(escrow)) == owed, "escrow books");
        require(dinr.balanceOf(address(router)) == 0, "router retained funds");
    }

    /// No claim type on any lot ever exceeds its verified eligible grams; settled lots were accepted.
    function invariant_claimsAreExclusive() public view {
        (, ProgrammeEscrow escrow,, VartulClaims claims, RecoveryLotRegistry lots,) = handler.contracts();
        uint256 n = handler.lotCount();
        for (uint256 i = 0; i < n; i++) {
            uint256 id = handler.lotList(i);
            LotView memory l = lots.getLot(id);
            for (uint8 t = 1; t <= 4; t++) {
                require(claims.allocatedGrams(id, t) <= l.eligibleGrams, "over-claimed");
            }
            require(
                !(claims.allocatedGrams(id, 2) > 0 && claims.allocatedGrams(id, 3) > 0), "EPR and OBP coexist"
            );
            if (l.state == LotState.SETTLED) require(escrow.lotAccepted(id), "settled without acceptance");
        }
    }
}
