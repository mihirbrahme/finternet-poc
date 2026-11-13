// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./VartulFixture.sol";

contract VartulProgrammeTest is VartulFixture {
    bytes32 internal constant LOT1 = keccak256("VRL-MRD-2026-0042");
    bytes32 internal constant LOT2 = keccak256("VRL-MRD-2026-0043");

    function setUp() public {
        _deployNetwork();
    }

    function _openFixed(bytes32 pid, uint256 target) internal {
        _openProgramme(_input(pid, escrow.FIXED_ON_TARGET(), target, 0, 15_000 ether, 6_240 ether, 2 days));
    }

    function _finalized(bytes32 lotId, bytes32 pid) internal {
        _toVerified(lotId, pid);
        vm.warp(block.timestamp + 2 days);
        lots.finalize(uint256(lotId));
    }

    // ----- Policies -----

    function testFixedPaymentReleasesOnlyWhenTargetMet() public {
        _openFixed(PID, 2_000_000);
        _finalized(LOT1, PID);
        assertEq(escrow.getProgramme(PID).paid, 0, "nothing before target");
        assertTrue(_state(LOT1) == LotState.VERIFIED, "awaiting target");
        assertEq(escrow.pendingLotsOf(PID).length, 1, "pending");

        _finalized(LOT2, PID);
        ProgrammeEscrow.Programme memory p = escrow.getProgramme(PID);
        assertEq(p.paid, 21_240 ether, "full budget at target");
        assertTrue(p.status == ProgrammeEscrow.Status.COMPLETED, "completed");
        assertTrue(_state(LOT1) == LotState.SETTLED && _state(LOT2) == LotState.SETTLED, "both settled");
        assertEq(p.settledGrams, 2_360_000, "settled grams");
        assertEq(claims.claimCount(), 4, "two sponsors x two lots");
    }

    function testPerKgCapScalesClaimsToFunding() public {
        _openProgramme(_input(PID, escrow.PER_KG_CAPPED(), 0, 18 ether, 6_000 ether, 4_000 ether, 2 days));
        _finalized(LOT1, PID);
        ProgrammeEscrow.Programme memory p = escrow.getProgramme(PID);
        assertEq(p.paid, 10_000 ether, "capped at budget");
        // ₹10,000 at ₹18/kg funds 555.555 kg: sponsors may claim only what they paid for.
        assertEq(claims.allocatedGrams(uint256(LOT1), 1), 555_555, "claims scaled");
        assertTrue(p.status == ProgrammeEscrow.Status.COMPLETED, "exhausted");

        // A completed programme accepts no further lots.
        vm.warp(block.timestamp + 7 days);
        RecoveryLotRegistry.MintInput memory m = _mintInput(LOT2, PID, [uint256(500_000), 450_000, 290_000], 60_000, 1_180_000);
        Attestation memory a = _att(Kinds.AGGREGATION_WEIGH, LOT2, m.aggregatedGrams, bytes32("root"));
        bytes memory sig = _sign(MRC_KEY, a);
        vm.expectRevert(RecoveryLotRegistry.InvalidInput.selector);
        lots.mintLot(m, a, sig);
    }

    // ----- Formation -----

    function testVerifierMustBeIndependentOfOriginator() public {
        ProgrammeEscrow.ProgrammeInput memory p = _input(PID, 2, 0, 18 ether, 1 ether, 1 ether, 0);
        p.verifier = AAMHI;
        vm.prank(sponsorA);
        vm.expectRevert(ProgrammeEscrow.InvalidInput.selector);
        escrow.propose(p);
    }

    function testOnlySponsorsPropose() public {
        ProgrammeEscrow.ProgrammeInput memory p = _input(PID, 2, 0, 18 ether, 1 ether, 1 ether, 0);
        vm.prank(orig);
        vm.expectRevert(ProgrammeEscrow.Denied.selector);
        escrow.propose(p);
    }

    function testOriginatorCannotAcceptUnfundedOrAlteredTerms() public {
        vm.prank(sponsorA);
        escrow.propose(_input(PID, 2, 0, 18 ether, 15_000 ether, 6_240 ether, 0));
        vm.prank(sponsorA);
        dinr.approve(address(escrow), 15_000 ether);
        vm.prank(sponsorA);
        escrow.fund(PID);
        vm.prank(orig);
        vm.expectRevert(ProgrammeEscrow.InvalidState.selector);
        escrow.accept(PID, TERMS);

        vm.prank(sponsorB);
        dinr.approve(address(escrow), 6_240 ether);
        vm.prank(sponsorB);
        escrow.fund(PID);
        vm.prank(orig);
        vm.expectRevert(ProgrammeEscrow.InvalidInput.selector);
        escrow.accept(PID, keccak256("different terms"));
        vm.prank(facility);
        vm.expectRevert(ProgrammeEscrow.Denied.selector);
        escrow.accept(PID, TERMS);
    }

    function testCancelledProposalRefundsFundedSponsors() public {
        vm.prank(sponsorA);
        escrow.propose(_input(PID, 2, 0, 18 ether, 15_000 ether, 6_240 ether, 0));
        vm.prank(sponsorA);
        dinr.approve(address(escrow), 15_000 ether);
        vm.prank(sponsorA);
        escrow.fund(PID);
        vm.prank(sponsorB);
        vm.expectRevert(ProgrammeEscrow.Denied.selector);
        escrow.cancel(PID);
        vm.prank(sponsorA);
        escrow.cancel(PID);
        assertEq(dinr.balanceOf(sponsorA), 1_000_000 ether, "refunded");
        assertEq(dinr.balanceOf(address(escrow)), 0, "escrow empty");
    }

    function testLotForUnacceptedProgrammeCannotMint() public {
        vm.prank(sponsorA);
        escrow.propose(_input(PID, 2, 0, 18 ether, 15_000 ether, 6_240 ether, 0));
        vm.warp(block.timestamp + 7 days);
        RecoveryLotRegistry.MintInput memory m = _mintInput(LOT1, PID, [uint256(500_000), 450_000, 290_000], 60_000, 1_180_000);
        m.windowStart = uint64(block.timestamp - 2 days);
        Attestation memory a = _att(Kinds.AGGREGATION_WEIGH, LOT1, m.aggregatedGrams, bytes32("root"));
        bytes memory sig = _sign(MRC_KEY, a);
        vm.expectRevert(RecoveryLotRegistry.InvalidInput.selector);
        lots.mintLot(m, a, sig);
    }

    // ----- Exceptions -----

    function testShortfallSettlementNeedsEveryPartyOnTheExactProposal() public {
        _openFixed(PID, 2_000_000);
        _finalized(LOT1, PID);

        vm.prank(orig);
        bytes32 first = escrow.proposeException(PID, 1, 12_000 ether, 0, keccak256("monsoon shortfall"));
        vm.prank(sponsorA);
        escrow.approveException(PID, first);
        assertEq(escrow.getProgramme(PID).paid, 0, "two of three is not enough");

        vm.prank(sponsorB);
        bytes32 revised = escrow.proposeException(PID, 1, 11_000 ether, 0, keccak256("monsoon shortfall"));
        vm.prank(orig);
        vm.expectRevert(ProgrammeEscrow.InvalidState.selector);
        escrow.approveException(PID, first);

        vm.prank(sponsorA);
        escrow.approveException(PID, revised);
        vm.prank(facility);
        vm.expectRevert(ProgrammeEscrow.Denied.selector);
        escrow.approveException(PID, revised);
        vm.prank(orig);
        escrow.approveException(PID, revised);

        ProgrammeEscrow.Programme memory p = escrow.getProgramme(PID);
        assertTrue(p.status == ProgrammeEscrow.Status.RESOLVED, "resolved");
        assertEq(p.paid, 11_000 ether, "agreed amount");
        assertEq(p.refunded, 10_240 ether, "rest refunded");
        assertEq(dinr.balanceOf(address(escrow)), 0, "escrow empty");
        assertTrue(_state(LOT1) == LotState.SETTLED, "pending lot settled");
        assertEq(claims.allocatedGrams(uint256(LOT1), 1), 1_180_000, "claims issued");
    }

    function testDeadlineExtensionByAgreement() public {
        _openFixed(PID, 2_000_000);
        uint64 next = escrow.getProgramme(PID).deadline + 60 days;
        vm.prank(sponsorA);
        bytes32 h = escrow.proposeException(PID, 2, 0, next, keccak256("cyclone"));
        vm.prank(sponsorB);
        escrow.approveException(PID, h);
        vm.prank(orig);
        escrow.approveException(PID, h);
        assertEq(escrow.getProgramme(PID).deadline, next, "extended");
    }

    // ----- Disputes and awards -----

    function testDisputePausesSettlementAndLapsesProposals() public {
        _openFixed(PID, 2_000_000);
        _finalized(LOT1, PID);
        vm.prank(orig);
        bytes32 h = escrow.proposeException(PID, 1, 20_000 ether, 0, bytes32("settle"));
        vm.prank(sponsorB);
        escrow.dispute(PID, keccak256("collector roster mismatch"));
        vm.prank(sponsorA);
        vm.expectRevert(ProgrammeEscrow.InvalidState.selector);
        escrow.approveException(PID, h);

        _toVerified(LOT2, PID);
        vm.warp(block.timestamp + 2 days);
        vm.expectRevert(ProgrammeEscrow.InvalidState.selector);
        lots.finalize(uint256(LOT2));

        // Parties may agree to resume.
        vm.prank(sponsorB);
        bytes32 resume = escrow.proposeException(PID, 3, 0, 0, bytes32("roster reconciled"));
        vm.prank(sponsorA);
        escrow.approveException(PID, resume);
        vm.prank(orig);
        escrow.approveException(PID, resume);
        lots.finalize(uint256(LOT2));
        assertEq(escrow.getProgramme(PID).paid, 21_240 ether, "paid after resumption");
    }

    function testArbitralAwardResolvesDispute() public {
        _openFixed(PID, 2_000_000);
        _finalized(LOT1, PID);
        vm.prank(orig);
        escrow.dispute(PID, bytes32("sponsor will not agree"));

        Attestation memory bad = _att(Kinds.ARBITRAL_AWARD, PID, 15_000 ether, bytes32("award"));
        bytes memory badSig = _sign(VERIFIER_KEY, bad);
        vm.expectRevert(VartulAttestations.Denied.selector);
        escrow.resolveByAward(PID, bad, badSig);

        Attestation memory a = _att(Kinds.ARBITRAL_AWARD, PID, 15_000 ether, keccak256("award:2026-ARB-07"));
        escrow.resolveByAward(PID, a, _sign(FAC_KEY, a));
        ProgrammeEscrow.Programme memory p = escrow.getProgramme(PID);
        assertTrue(p.status == ProgrammeEscrow.Status.RESOLVED, "resolved");
        assertEq(p.paid, 15_000 ether, "award paid");
        assertEq(p.refunded, 6_240 ether, "balance refunded");
        assertTrue(_state(LOT1) == LotState.SETTLED, "lot settled");
    }

    function testExpiryReturnsUnspentFunds() public {
        _openPerKg(PID);
        _finalized(LOT1, PID);
        assertEq(dinr.balanceOf(address(escrow)), 0, "fully spent");

        bytes32 pid2 = keccak256("PRG-2");
        _openPerKg(pid2);
        vm.expectRevert(ProgrammeEscrow.InvalidState.selector);
        escrow.expire(pid2);
        vm.warp(block.timestamp + 211 days);
        escrow.expire(pid2);
        assertTrue(escrow.getProgramme(pid2).status == ProgrammeEscrow.Status.EXPIRED, "expired");
        assertEq(dinr.balanceOf(address(escrow)), 0, "refunded");
        assertEq(dinr.balanceOf(sponsorA), 1_000_000 ether - 15_000 ether, "sponsor A paid only for the settled lot");
    }

    function testNoPartyCanWithdrawEscrowUnilaterally() public {
        _openPerKg(PID);
        vm.prank(sponsorA);
        vm.expectRevert(ProgrammeEscrow.InvalidState.selector);
        escrow.cancel(PID);
        vm.prank(sponsorA);
        vm.expectRevert(ProgrammeEscrow.InvalidState.selector);
        escrow.expire(PID);
        vm.prank(sponsorA);
        vm.expectRevert(ProgrammeEscrow.Denied.selector);
        escrow.acceptLot(uint256(LOT1));
    }

    // ----- Fuzz: settlement conserves money for any split of grams -----

    function testFuzzSettlementConservesMoney(uint32 g0, uint32 g1, uint32 g2, uint16 contaminationBps, uint16 eligibleBps, uint64 rate)
        public
    {
        uint256[3] memory grams = [uint256(g0 % 2_000_000), uint256(g1 % 2_000_000), uint256(g2 % 2_000_000) + 1];
        uint256 input = grams[0] + grams[1] + grams[2];
        uint256 contamination = input * (contaminationBps % 5_000) / 10_000;
        uint256 aggregated = input - contamination;
        vm.assume(aggregated > 0);
        uint256 eligible = aggregated * (eligibleBps % 10_001) / 10_000;
        vm.assume(eligible > 0);
        uint256 ratePerKg = 1 ether + uint256(rate) % 100 ether;

        _openProgramme(_input(PID, escrow.PER_KG_CAPPED(), 0, ratePerKg, 15_000 ether, 6_240 ether, 0));
        vm.warp(block.timestamp + 7 days);
        RecoveryLotRegistry.MintInput memory m = _mintInput(LOT1, PID, grams, contamination, aggregated);
        Attestation memory a = _att(Kinds.AGGREGATION_WEIGH, LOT1, aggregated, bytes32("root"));
        lots.mintLot(m, a, _sign(MRC_KEY, a));
        _dispatch(LOT1);
        _receive(LOT1, aggregated);
        _verify(LOT1, eligible);

        ProgrammeEscrow.Programme memory p = escrow.getProgramme(PID);
        uint256 outflow = dinr.balanceOf(orig) + dinr.balanceOf(verifier) + dinr.balanceOf(saathi[0])
            + dinr.balanceOf(saathi[1]) + dinr.balanceOf(saathi[2]);
        assertEq(outflow, p.paid, "every rupee paid lands with a party");
        assertEq(dinr.balanceOf(address(escrow)), p.funded - p.paid, "escrow holds the rest");
        assertEq(dinr.balanceOf(address(router)), 0, "router never retains");
        assertTrue(claims.allocatedGrams(uint256(LOT1), 1) <= eligible, "claims within eligible");
        assertEq(dinr.balanceOf(verifier), p.paid * 500 / 10_000, "verifier share exact");
    }
}
