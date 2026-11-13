// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./VartulFixture.sol";

contract VartulLifecycleTest is VartulFixture {
    bytes32 internal constant LOT = keccak256("VRL-MRD-2026-0042");

    function setUp() public {
        _deployNetwork();
        _openPerKg(PID);
    }

    // ----- Happy path -----

    function testWorkedExampleSettlesAtomically() public {
        _toVerified(LOT, PID);
        assertTrue(_state(LOT) == LotState.VERIFIED, "verified");
        uint256 origBefore = dinr.balanceOf(orig);

        vm.warp(block.timestamp + 2 days);
        lots.finalize(uint256(LOT));

        assertTrue(_state(LOT) == LotState.SETTLED, "settled");
        // ₹21,240 = 1,180 kg x ₹18. Split 40% collectors / 55% originator / 5% verifier.
        uint256 collectors = dinr.balanceOf(saathi[0]) + dinr.balanceOf(saathi[1]) + dinr.balanceOf(saathi[2]);
        uint256 origGain = dinr.balanceOf(orig) - origBefore;
        assertEq(dinr.balanceOf(verifier), 1_062 ether, "verifier fee");
        assertEq(collectors + origGain, 20_178 ether, "collector + originator");
        assertTrue(collectors <= 8_496 ether && collectors > 8_495 ether, "collector share");
        assertTrue(dinr.balanceOf(saathi[0]) > dinr.balanceOf(saathi[1]), "pro rata by grams");
        assertEq(dinr.balanceOf(address(escrow)), 0, "escrow drained");
        assertEq(dinr.balanceOf(address(router)), 0, "router holds nothing");

        ProgrammeEscrow.Programme memory p = escrow.getProgramme(PID);
        assertTrue(p.status == ProgrammeEscrow.Status.COMPLETED, "programme completed");
        assertEq(p.paid, 21_240 ether, "paid");
        assertEq(p.settledGrams, 1_180_000, "settled grams");

        uint256[] memory ids = claims.claimsOfLot(uint256(LOT));
        assertEq(ids.length, 2, "one claim per sponsor");
        assertEq(claims.getClaim(ids[0]).grams + claims.getClaim(ids[1]).grams, 1_180_000, "claims = eligible");
        assertEq(claims.getClaim(ids[0]).grams, 833_333, "pro rata to Tidewell");
        assertTrue(claims.getClaim(ids[0]).holder == sponsorA, "holder");
        assertTrue(claims.statusOf(ids[0]) == VartulClaims.Status.VALID, "valid");
        assertEq(claims.allocatedGrams(uint256(LOT), 1), 1_180_000, "allocated");
    }

    function testLotIsSemiFungibleTokenInGrams() public {
        _mintStandard(LOT, PID);
        assertEq(lots.balanceOf(orig, uint256(LOT)), 1_180_000, "minted to originator treasury");
        LotView memory l = lots.getLot(uint256(LOT));
        assertEq(l.inputGrams, 1_240_000, "input");
        assertEq(l.contaminationGrams, 60_000, "contamination");
        assertTrue(l.proofRoot == keccak256(abi.encode("proof", LOT)), "proof root");
        assertTrue(lots.supportsInterface(0xd9b67a26), "erc1155");
        vm.prank(orig);
        vm.expectRevert(RecoveryLotRegistry.NotSupported.selector);
        lots.safeTransferFrom(orig, buyer, uint256(LOT), 1, "");
    }

    function testZeroChallengeWindowSettlesOnVerification() public {
        bytes32 pid = keccak256("PRG-INSTANT");
        _openProgramme(_input(pid, escrow.PER_KG_CAPPED(), 0, 18 ether, 15_000 ether, 6_240 ether, 0));
        _toVerified(LOT, pid);
        assertTrue(_state(LOT) == LotState.SETTLED, "settled in the verification transaction");
    }

    // ----- Mint-time controls -----

    function testMassBalanceRejected() public {
        vm.warp(block.timestamp + 7 days);
        // 1,240 kg in, 60 kg contamination: 1,180 kg + 1% tolerance is the ceiling.
        RecoveryLotRegistry.MintInput memory m = _mintInput(LOT, PID, [uint256(500_000), 450_000, 290_000], 60_000, 1_192_000);
        Attestation memory a = _att(Kinds.AGGREGATION_WEIGH, LOT, m.aggregatedGrams, bytes32("root"));
        bytes memory sig = _sign(MRC_KEY, a);
        vm.expectRevert(RecoveryLotRegistry.MassBalance.selector);
        lots.mintLot(m, a, sig);
    }

    function testCollectorGramsMustSumToInput() public {
        vm.warp(block.timestamp + 7 days);
        RecoveryLotRegistry.MintInput memory m = _mintInput(LOT, PID, [uint256(500_000), 450_000, 290_000], 60_000, 1_180_000);
        m.inputGrams = 1_300_000;
        Attestation memory a = _att(Kinds.AGGREGATION_WEIGH, LOT, m.aggregatedGrams, bytes32("root"));
        bytes memory sig = _sign(MRC_KEY, a);
        vm.expectRevert(RecoveryLotRegistry.MassBalance.selector);
        lots.mintLot(m, a, sig);
    }

    function testMaterialBeforeCommitmentIsNotAdditional() public {
        vm.warp(block.timestamp + 7 days);
        RecoveryLotRegistry.MintInput memory m = _mintInput(LOT, PID, [uint256(500_000), 450_000, 290_000], 60_000, 1_180_000);
        m.windowStart = T0 - 1 days;
        Attestation memory a = _att(Kinds.AGGREGATION_WEIGH, LOT, m.aggregatedGrams, bytes32("root"));
        bytes memory sig = _sign(MRC_KEY, a);
        vm.expectRevert(RecoveryLotRegistry.InvalidInput.selector);
        lots.mintLot(m, a, sig);
    }

    function testOnlyMrcOperatorCanAttestAggregation() public {
        vm.warp(block.timestamp + 7 days);
        RecoveryLotRegistry.MintInput memory m = _mintInput(LOT, PID, [uint256(500_000), 450_000, 290_000], 60_000, 1_180_000);
        Attestation memory a = _att(Kinds.AGGREGATION_WEIGH, LOT, m.aggregatedGrams, bytes32("root"));
        bytes memory sig = _sign(FACILITY_KEY, a);
        vm.expectRevert(VartulAttestations.Denied.selector);
        lots.mintLot(m, a, sig);
    }

    function testUnregisteredSubmitterCannotRelay() public {
        vm.warp(block.timestamp + 7 days);
        RecoveryLotRegistry.MintInput memory m = _mintInput(LOT, PID, [uint256(500_000), 450_000, 290_000], 60_000, 1_180_000);
        Attestation memory a = _att(Kinds.AGGREGATION_WEIGH, LOT, m.aggregatedGrams, bytes32("root"));
        bytes memory sig = _sign(MRC_KEY, a);
        vm.prank(address(0xBAD));
        vm.expectRevert(VartulAttestations.Denied.selector);
        lots.mintLot(m, a, sig);
    }

    function testCollectorFromAnotherOrganisationRejected() public {
        registry.setAccount(address(0x5A99), TALVAN, Roles.COLLECTOR, 0, bytes32("x"));
        vm.warp(block.timestamp + 7 days);
        RecoveryLotRegistry.MintInput memory m = _mintInput(LOT, PID, [uint256(500_000), 450_000, 290_000], 60_000, 1_180_000);
        m.collectors[2] = address(0x5A99);
        Attestation memory a = _att(Kinds.AGGREGATION_WEIGH, LOT, m.aggregatedGrams, bytes32("root"));
        bytes memory sig = _sign(MRC_KEY, a);
        vm.expectRevert(RecoveryLotRegistry.InvalidInput.selector);
        lots.mintLot(m, a, sig);
    }

    function testExpiredCredentialCannotAttest() public {
        registry.setAccount(mrc, AAMHI, Roles.MRC_OPERATOR, uint64(block.timestamp + 1 days), keccak256("vc:mrc"));
        vm.warp(block.timestamp + 7 days);
        RecoveryLotRegistry.MintInput memory m = _mintInput(LOT, PID, [uint256(500_000), 450_000, 290_000], 60_000, 1_180_000);
        Attestation memory a = _att(Kinds.AGGREGATION_WEIGH, LOT, m.aggregatedGrams, bytes32("root"));
        bytes memory sig = _sign(MRC_KEY, a);
        vm.expectRevert(VartulAttestations.Denied.selector);
        lots.mintLot(m, a, sig);
    }

    function testAttestationReplayRejected() public {
        vm.prank(fac);
        att.setStandaloneKind(keccak256("PANCHAYAT_COSIGN"), Roles.PANCHAYAT);
        Attestation memory a = _att(keccak256("PANCHAYAT_COSIGN"), LOT, 0, bytes32("ward-3"));
        bytes memory sig = _sign(PANCHAYAT_KEY, a);
        att.attestStandalone(a, sig);
        vm.expectRevert(VartulAttestations.AlreadyRecorded.selector);
        att.attestStandalone(a, sig);
    }

    function testMalleableSignatureRejected() public {
        vm.prank(fac);
        att.setStandaloneKind(keccak256("PANCHAYAT_COSIGN"), Roles.PANCHAYAT);
        Attestation memory a = _att(keccak256("PANCHAYAT_COSIGN"), LOT, 0, bytes32("ward-3"));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(PANCHAYAT_KEY, att.digest(a));
        uint256 n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;
        bytes memory flipped = abi.encodePacked(r, bytes32(n - uint256(s)), v == 27 ? uint8(28) : uint8(27));
        vm.expectRevert(VartulAttestations.BadSignature.selector);
        att.attestStandalone(a, flipped);
    }

    // ----- Custody and verification -----

    function testReceiptAboveToleranceRejected() public {
        _mintStandard(LOT, PID);
        _dispatch(LOT);
        Attestation memory a = _att(Kinds.RECEIPT, LOT, 1_210_000, bytes32("gate"));
        bytes memory sig = _sign(FACILITY_KEY, a);
        vm.expectRevert(RecoveryLotRegistry.MassBalance.selector);
        lots.confirmReceipt(uint256(LOT), a, sig);
    }

    function testUnappointedVerifierRejected() public {
        _mintStandard(LOT, PID);
        _dispatch(LOT);
        _receive(LOT, 1_180_000);
        RecoveryLotRegistry.Exclusion[] memory none = new RecoveryLotRegistry.Exclusion[](0);
        Attestation memory a = _att(Kinds.VERIFICATION, LOT, 1_180_000, bytes32("report"));
        bytes memory sig = _sign(ROGUE_KEY, a);
        vm.expectRevert(RecoveryLotRegistry.Denied.selector);
        lots.verify(uint256(LOT), none, a, sig);
    }

    function testVerifierCannotExceedReceivedGrams() public {
        _mintStandard(LOT, PID);
        _dispatch(LOT);
        _receive(LOT, 1_150_000);
        RecoveryLotRegistry.Exclusion[] memory none = new RecoveryLotRegistry.Exclusion[](0);
        Attestation memory a = _att(Kinds.VERIFICATION, LOT, 1_160_000, bytes32("report"));
        bytes memory sig = _sign(VERIFIER_KEY, a);
        vm.expectRevert(RecoveryLotRegistry.InvalidInput.selector);
        lots.verify(uint256(LOT), none, a, sig);
    }

    function testExcludedCollectorGramsAreNotPaid() public {
        _mintStandard(LOT, PID);
        _dispatch(LOT);
        _receive(LOT, 1_180_000);
        RecoveryLotRegistry.Exclusion[] memory ex = new RecoveryLotRegistry.Exclusion[](1);
        ex[0] = RecoveryLotRegistry.Exclusion(saathi[2], 290_000);
        Attestation memory a = _att(Kinds.VERIFICATION, LOT, 1_000_000, bytes32("report"));
        lots.verify(uint256(LOT), ex, a, _sign(VERIFIER_KEY, a));
        vm.warp(block.timestamp + 2 days);
        lots.finalize(uint256(LOT));
        assertEq(dinr.balanceOf(saathi[2]), 0, "excluded saathi unpaid");
        assertTrue(dinr.balanceOf(saathi[0]) > 0, "others paid");
        // 1,000 kg eligible x ₹18 = ₹18,000; the unspent ₹3,240 remains for later lots.
        assertEq(escrow.getProgramme(PID).paid, 18_000 ether, "paid on eligible grams");
    }

    function testZeroEligibleRejectsLot() public {
        _mintStandard(LOT, PID);
        _dispatch(LOT);
        _receive(LOT, 1_180_000);
        _verify(LOT, 0);
        assertTrue(_state(LOT) == LotState.REJECTED, "rejected");
        vm.expectRevert(RecoveryLotRegistry.InvalidState.selector);
        lots.finalize(uint256(LOT));
    }

    // ----- Challenge window -----

    function testCannotFinalizeInsideChallengeWindow() public {
        _toVerified(LOT, PID);
        vm.expectRevert(RecoveryLotRegistry.InvalidState.selector);
        lots.finalize(uint256(LOT));
    }

    function testPanchayatChallengeAndAdjustedResolution() public {
        _toVerified(LOT, PID);
        vm.prank(panchayat);
        lots.challenge(uint256(LOT), keccak256("ward-3 route not served that week"));
        assertTrue(_state(LOT) == LotState.CHALLENGED, "challenged");
        vm.warp(block.timestamp + 3 days);
        vm.expectRevert(RecoveryLotRegistry.InvalidState.selector);
        lots.finalize(uint256(LOT));

        Attestation memory a = _att(Kinds.RESOLUTION, LOT, 1_000_000, bytes32("site-visit"));
        lots.resolveChallenge(uint256(LOT), a, _sign(VERIFIER_KEY, a));
        assertTrue(_state(LOT) == LotState.SETTLED, "settled after resolution");
        assertEq(escrow.getProgramme(PID).paid, 18_000 ether, "paid on resolved grams");
    }

    function testStrangerCannotChallenge() public {
        _toVerified(LOT, PID);
        vm.prank(buyer);
        vm.expectRevert(RecoveryLotRegistry.Denied.selector);
        lots.challenge(uint256(LOT), bytes32("no standing"));
    }

    // ----- Revocation cascade -----

    function testRevokedReceiptMakesClaimsContestedThenRevoked() public {
        _toVerified(LOT, PID);
        vm.warp(block.timestamp + 2 days);
        lots.finalize(uint256(LOT));
        uint256 claimId = claims.claimsOfLot(uint256(LOT))[0];

        vm.expectRevert(RecoveryLotRegistry.InvalidState.selector);
        lots.markUnderReview(uint256(LOT));

        bytes32 receiptAtt = lots.getLot(uint256(LOT)).receiptAtt;
        vm.prank(facility);
        att.revoke(receiptAtt, keccak256("weighbridge calibration lapsed"));
        vm.prank(address(0xCAFE));
        lots.markUnderReview(uint256(LOT));
        assertTrue(claims.statusOf(claimId) == VartulClaims.Status.CONTESTED, "contested");

        Attestation memory a = _att(Kinds.RESOLUTION, LOT, 0, bytes32("review"));
        vm.prank(fac);
        lots.concludeReview(uint256(LOT), true, a, _sign(FAC_KEY, a));
        assertTrue(_state(LOT) == LotState.VOIDED, "voided");
        assertTrue(claims.statusOf(claimId) == VartulClaims.Status.REVOKED, "revoked downstream");
    }

    function testReviewCanRestorePriorState() public {
        _toVerified(LOT, PID);
        vm.warp(block.timestamp + 2 days);
        lots.finalize(uint256(LOT));
        bytes32 receiptAtt = lots.getLot(uint256(LOT)).receiptAtt;
        vm.prank(facility);
        att.revoke(receiptAtt, bytes32("query"));
        lots.markUnderReview(uint256(LOT));
        Attestation memory a = _att(Kinds.RESOLUTION, LOT, 0, bytes32("cleared"));
        vm.prank(fac);
        lots.concludeReview(uint256(LOT), false, a, _sign(FAC_KEY, a));
        assertTrue(_state(LOT) == LotState.SETTLED, "restored");
    }

    // ----- Material sale (DvP) and claim compatibility -----

    function testMaterialSaleIsDeliveryVersusPayment() public {
        _toVerified(LOT, PID);
        vm.warp(block.timestamp + 2 days);
        lots.finalize(uint256(LOT));

        vm.prank(orig);
        uint256 offerId = market.createOffer(uint256(LOT), buyer, 9_440 ether, uint64(block.timestamp + 7 days));
        uint256 sellerBefore = dinr.balanceOf(orig);
        vm.prank(buyer);
        dinr.approve(address(market), 9_440 ether);
        vm.prank(buyer);
        uint256 eprClaim = market.acceptOffer(offerId);

        assertEq(lots.balanceOf(buyer, uint256(LOT)), 1_180_000, "material delivered");
        assertEq(lots.balanceOf(orig, uint256(LOT)), 0, "seller released");
        assertEq(dinr.balanceOf(orig) - sellerBefore, 9_440 ether, "payment received");
        assertTrue(claims.getClaim(eprClaim).claimType == 2, "EPR-ready supply claim");

        uint256 fundedClaim = claims.claimsOfLot(uint256(LOT))[0];
        uint8[] memory disclose = claims.disclosuresOf(fundedClaim);
        assertEq(disclose.length, 1, "funded claim discloses EPR claim");
        assertEq(disclose[0], 2, "EPR");

        vm.prank(assessor);
        vm.expectRevert(abi.encodeWithSelector(VartulClaims.Incompatible.selector, uint8(2), uint8(3)));
        claims.issueObpReady(sponsorA, uint256(LOT), 100_000);
    }

    function testNoSaleOrClaimInsideChallengeWindow() public {
        _toVerified(LOT, PID);
        vm.prank(orig);
        vm.expectRevert(MaterialSettlement.InvalidState.selector);
        market.createOffer(uint256(LOT), buyer, 1 ether, uint64(block.timestamp + 7 days));
        vm.prank(fac);
        claims.setAllocator(address(this), true);
        vm.expectRevert(VartulClaims.NotFinal.selector);
        claims.allocate(2, buyer, uint256(LOT), 1, PID);
    }

    function testDvPWithoutPaymentMovesNothing() public {
        _toVerified(LOT, PID);
        vm.warp(block.timestamp + 2 days);
        vm.prank(orig);
        uint256 offerId = market.createOffer(uint256(LOT), buyer, 9_440 ether, uint64(block.timestamp + 7 days));
        vm.prank(buyer);
        vm.expectRevert();
        market.acceptOffer(offerId);
        assertEq(lots.balanceOf(orig, uint256(LOT)), 1_180_000, "material stays");
        assertEq(claims.claimCount(), 0, "no claim");
    }

    function testOnlyBuyersReceiveMaterial() public {
        _toVerified(LOT, PID);
        vm.warp(block.timestamp + 2 days);
        vm.prank(orig);
        uint256 offerId = market.createOffer(uint256(LOT), address(0), 1 ether, uint64(block.timestamp + 7 days));
        vm.prank(sponsorA);
        dinr.approve(address(market), 1 ether);
        vm.prank(sponsorA);
        vm.expectRevert(MaterialSettlement.Denied.selector);
        market.acceptOffer(offerId);
    }

    function testClaimsCannotExceedEligibleGrams() public {
        _toVerified(LOT, PID);
        vm.warp(block.timestamp + 2 days);
        lots.finalize(uint256(LOT));
        vm.prank(fac);
        claims.setAllocator(address(this), true);
        vm.expectRevert(VartulClaims.OverAllocated.selector);
        claims.allocate(1, sponsorA, uint256(LOT), 1, PID);
        claims.allocate(4, facility, uint256(LOT), 1_180_000, PID);
        vm.expectRevert(VartulClaims.OverAllocated.selector);
        claims.allocate(4, facility, uint256(LOT), 1, PID);
    }

    function testProcessingConfirmation() public {
        _toVerified(LOT, PID);
        vm.warp(block.timestamp + 2 days);
        lots.finalize(uint256(LOT));
        Attestation memory a = _att(Kinds.PROCESSING, LOT, 1_120_000, bytes32("pellets"));
        lots.recordProcessing(uint256(LOT), a, _sign(FACILITY_KEY, a));
        vm.prank(facility);
        uint256 id = claims.issueProcessingConfirmed(facility, uint256(LOT));
        assertEq(claims.getClaim(id).grams, 1_120_000, "processed grams");
    }

    // ----- Money rails -----

    function testSandboxMoneyOnlyReachesRegisteredHolders() public {
        vm.prank(sponsorA);
        vm.expectRevert(abi.encodeWithSelector(SandboxINR.NotEligible.selector, address(0xBEEF)));
        dinr.transfer(address(0xBEEF), 1 ether);
    }

    function testSuspendedOrganisationCannotHoldMoney() public {
        registry.setParticipant(NEELKANTH, false, address(0));
        vm.prank(sponsorA);
        vm.expectRevert(abi.encodeWithSelector(SandboxINR.NotEligible.selector, sponsorB));
        dinr.transfer(sponsorB, 1 ether);
    }
}
