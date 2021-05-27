const spawn = artifacts.require('Bitspawn');
const BigNumber = require('bignumber.js');

contract('spwn token tests', accounts => {
    const [admin, bob, cetol, ...rest] = accounts;

    const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000"
    const MINT_BURN_ROLE = "0xa60cb0df7bc178038b993aa2e0df2e2cfb6627f4695e4261227d47422ae7e2a6"
    const addressZero = "0x0000000000000000000000000000000000000000"

    const tokenAmountBase = 10 ** 18
    const mintAmount = new BigNumber(100 * tokenAmountBase).toFixed()
    const burnAmount = new BigNumber(90 * tokenAmountBase).toFixed()
    const leftOverAmount = new BigNumber(10 * tokenAmountBase).toFixed()
    const decreaseAllowanceAmount = new BigNumber(50 * tokenAmountBase).toFixed()
    const zeroBalance = 0

    const maxSupply = new BigNumber(2 * 10 ** 9 * tokenAmountBase);
    const maxTotalSupply = maxSupply.toFixed()

    let contract;

    beforeEach(async () => {
        contract = await spawn.new()
    });

    // general contract info and init status
    it('1. get name', async () => {
        const tokenName = await contract.name()
        assert.equal(tokenName, "BitSpawn Token")
    });

    it('2. get symbol', async () => {
        const tokenSymbol = await contract.symbol()
        assert.equal(tokenSymbol, "SPWN")
    });

    it('3. get init stopped status', async () => {
        const pauseStatus1 = await contract.stopped()
        const pauseStatus2 = await contract.paused()
        assert.equal(pauseStatus1, pauseStatus2)
        assert.equal(pauseStatus2, false)
    });

    it('4. get total supply', async () => {
        const totalSupply = await contract.totalSupply()
        assert.equal(totalSupply, 0)
    });

    it('5. get decimal', async () => {
        const d = await contract.decimals()
        assert.equal(d, 18)
    });

    it('6. get owner', async () => {
        const owner = await contract.owner()
        assert.equal(owner, admin)
    });

    it('7. owner has admin role', async () => {
        const ok = await contract.hasRole(DEFAULT_ADMIN_ROLE, admin)
        assert.equal(ok, true)
    });

    it('8. owner has mint_burn role', async () => {
        const ok = await contract.hasRole(MINT_BURN_ROLE, admin)
        assert.equal(ok, true)
    });

    // ownership change
    it('9. admin adds bob as the pending owner', async () => {
        const currentPendingOwner1 = await contract.getPendingOwner({from: admin})
        assert.equal(currentPendingOwner1, addressZero)

        await contract.transferOwnership(bob, {from: admin})
        const currentOwner = await contract.owner()
        assert.equal(currentOwner, admin)

        const currentPendingOwner2 = await contract.getPendingOwner({from: admin})
        assert.equal(currentPendingOwner2, bob)
    });

    it('9.1. admin adds address(0) as pending owner', async () => {
        await contract.transferOwnership(addressZero, {from: admin}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Pending owner can not be zero address -- Reason given: Pending owner can not be zero address.")
        })
        const currentOwner = await contract.owner()
        assert.equal(currentOwner, admin)
    });

    it('9.2. admin adds himself as pending owner', async () => {
        await contract.transferOwnership(admin, {from: admin}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Pending owner and current owner need to be different -- Reason given: Pending owner and current owner need to be different.")
        })
        const currentOwner = await contract.owner()
        assert.equal(currentOwner, admin)
    });

    it('9.3. admin adds bob as the pending owner then try to replace it with cetol', async () => {
        await contract.transferOwnership(bob, {from: admin})
        const currentOwner1 = await contract.owner()
        assert.equal(currentOwner1, admin)

        const currentPendingOwner1 = await contract.getPendingOwner({from: admin})
        assert.equal(currentPendingOwner1, bob)

        await contract.transferOwnership(cetol, {from: admin})

        const currentPendingOwner2 = await contract.getPendingOwner({from: admin})
        assert.equal(currentPendingOwner2, cetol)
    });

    it('9.4. bob tries to add pending owner', async () => {
        await contract.transferOwnership(cetol, {from: bob}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.")
        })
        const currentOwner1 = await contract.owner()
        assert.equal(currentOwner1, admin)

        const currentPendingOwner1 = await contract.getPendingOwner({from: admin})
        assert.equal(currentPendingOwner1, addressZero)
    });

    it('9.5. bob tries to query pending owner', async () => {
        await contract.getPendingOwner({from: bob}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Ownable: caller is not the owner")
        })
    });

    it('9.6. admin accepts the ownership to bob', async () => {
        await contract.transferOwnership(bob, {from: admin})
        const currentOwner = await contract.owner()
        assert.equal(currentOwner, admin)

        const pendingOwner1 = await contract.getPendingOwner({from: admin})
        assert.equal(pendingOwner1, bob)

        await contract.acceptOwnership({from: bob})

        // new owner has default admin and mint_burn roles
        const hasAdminRole = await contract.hasRole(DEFAULT_ADMIN_ROLE, bob)
        assert.equal(hasAdminRole, true)
        const hasMintBurnRole = await contract.hasRole(MINT_BURN_ROLE, bob)
        assert.equal(hasMintBurnRole, true)

        // old owner does not have default admin and mint_burn roles
        const hasAdminRole_old = await contract.hasRole(DEFAULT_ADMIN_ROLE, admin)
        assert.equal(hasAdminRole_old, false)
        const hasMintBurnRole_old = await contract.hasRole(MINT_BURN_ROLE, admin)
        assert.equal(hasMintBurnRole_old, false)

        // pending owner should be zero address
        const pendingOwner = await contract.getPendingOwner({from: bob})
        assert.equal(pendingOwner, addressZero)
    });

    it('10. cetol calls to accept the ownership to himself after admin sets bob as pending owner', async () => {
        await contract.transferOwnership(bob, {from: admin})
        const currentOwner = await contract.owner()
        assert.equal(currentOwner, admin)

        const pendingOwner = await contract.getPendingOwner({from: admin})
        assert.equal(pendingOwner, bob)

        await contract.acceptOwnership({from: cetol}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Only pending owner is able to accept the ownership -- Reason given: Only pending owner is able to accept the ownership.")
        })
        const newOwner = await contract.owner()
        assert.equal(newOwner, admin)

        const pendingOwner2 = await contract.getPendingOwner({from: admin})
        assert.equal(pendingOwner2, bob)

        await contract.acceptOwnership({from: bob})
        const newOwner1 = await contract.owner()
        assert.equal(newOwner1, bob)

        const pendingOwner3 = await contract.getPendingOwner({from: bob})
        assert.equal(pendingOwner3, addressZero)
    });

    // ERC20 functions
    it('11. transfer: admin to bob', async () => {
        await contract.mint(admin, mintAmount, {from: admin})
        const adminBalanceBefore = await contract.balanceOf(admin)
        const bobBalanceBefore = await contract.balanceOf(bob)
        assert.equal(adminBalanceBefore, mintAmount)
        assert.equal(bobBalanceBefore, zeroBalance)

        await contract.transfer(bob, burnAmount, {from: admin})

        const adminBalanceAfter = await contract.balanceOf(admin)
        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(adminBalanceAfter, leftOverAmount)
        assert.equal(bobBalanceAfter, burnAmount)
    });

    it('12. transferForm: admin to bob', async () => {
        await contract.mint(admin, mintAmount, {from: admin})
        const adminBalanceBefore = await contract.balanceOf(admin)
        const bobBalanceBefore = await contract.balanceOf(bob)
        assert.equal(adminBalanceBefore, mintAmount)
        assert.equal(bobBalanceBefore, zeroBalance)

        // failed because of amount exceeding allowance
        await contract.transferFrom(admin, bob, burnAmount, {from: bob}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert ERC20: transfer amount exceeds allowance -- Reason given: ERC20: transfer amount exceeds allowance.")
        })

        const adminBalanceAfter = await contract.balanceOf(admin)
        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(adminBalanceAfter, mintAmount)
        assert.equal(bobBalanceAfter, zeroBalance)

        await contract.approve(bob, burnAmount, {from: admin})

        await contract.transferFrom(admin, bob, burnAmount, {from: bob})

        const adminBalanceAfter2 = await contract.balanceOf(admin)
        const bobBalanceAfter2 = await contract.balanceOf(bob)
        assert.equal(adminBalanceAfter2, leftOverAmount)
        assert.equal(bobBalanceAfter2, burnAmount)
    });

    it('13. admin grants allowance to bob 100 SPWN', async () => {
        await contract.mint(admin, mintAmount, {from: admin})
        const adminBalanceBefore = await contract.balanceOf(admin)
        const bobBalanceBefore = await contract.balanceOf(bob)
        assert.equal(adminBalanceBefore, mintAmount)
        assert.equal(bobBalanceBefore, zeroBalance)

        const aTOb_allowanceBefore = await contract.allowance(admin, bob)
        assert.equal(aTOb_allowanceBefore, zeroBalance)

        await contract.increaseAllowance(bob, mintAmount, {from: admin})

        const aTOb_allowanceAfter = await contract.allowance(admin, bob)
        assert.equal(aTOb_allowanceAfter, mintAmount)

        await contract.transferFrom(admin, bob, mintAmount, {from: bob})
        const bobBalance = await contract.balanceOf(bob)
        assert.equal(bobBalance, mintAmount)

        const aTOb_allowanceBefore2 = await contract.allowance(admin, bob)
        assert.equal(aTOb_allowanceBefore2, zeroBalance)

        const adminBalanceAfter = await contract.balanceOf(admin)
        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(adminBalanceAfter, zeroBalance)
        assert.equal(bobBalanceAfter, mintAmount)
    });

    it('14. admin decrease allowance to bob 50 SPWN', async () => {
        const aTOb_allowanceBefore = await contract.allowance(admin, bob)
        assert.equal(aTOb_allowanceBefore, zeroBalance)

        await contract.increaseAllowance(bob, mintAmount, {from: admin})

        const aTOb_allowanceAfter = await contract.allowance(admin, bob)
        assert.equal(aTOb_allowanceAfter, mintAmount)

        await contract.decreaseAllowance(bob, decreaseAllowanceAmount, {from: admin})

        const aTOb_allowanceBefore2 = await contract.allowance(admin, bob)
        assert.equal(aTOb_allowanceBefore2, decreaseAllowanceAmount)
    });

    // mint & burn
    it('15. admin mints for bob 100 SPWN', async () => {
        await contract.mint(bob, mintAmount, {from: admin})
        const bobBalance = await contract.balanceOf(bob)
        assert.equal(bobBalance, mintAmount)
    });

    it('16. bob mints for bob 100 SPWN', async () => {
        await contract.mint(bob, mintAmount, {from: bob}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Caller is not allowed to mint -- Reason given: Caller is not allowed to mint.")
        })
        const bobBalance = await contract.balanceOf(bob)
        assert.equal(bobBalance, zeroBalance)
    });

    it('17. admin burns from bob 100 SPWN', async () => {
        await contract.mint(bob, mintAmount, {from: admin})
        const bobBalanceAfterMint = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfterMint, mintAmount)

        await contract.burn(bob, burnAmount, {from: admin})
        const bobBalanceAfterBurn = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfterBurn, leftOverAmount)
    });

    it('18. bob burns from bob 100 SPWN', async () => {
        await contract.mint(bob, mintAmount, {from: admin})
        const bobBalanceAfterMint = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfterMint, mintAmount)

        await contract.burn(bob, burnAmount, {from: bob}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Caller is not allowed to burn -- Reason given: Caller is not allowed to burn.")
        })
        const bobBalanceAfterBurn = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfterBurn, mintAmount)
    });

    it('19. mint after stop then resume', async () => {
        const pauseStatusBefore1 = await contract.stopped()
        const pauseStatusBefore2 = await contract.paused()
        assert.equal(pauseStatusBefore1, pauseStatusBefore2)
        assert.equal(pauseStatusBefore2, false)

        const bobBalanceBeforeStop = await contract.balanceOf(bob)
        assert.equal(bobBalanceBeforeStop, zeroBalance)

        await contract.stop()

        const pauseStatusAfter1 = await contract.stopped()
        const pauseStatusAfter2 = await contract.paused()
        assert.equal(pauseStatusAfter1, pauseStatusAfter2)
        assert.equal(pauseStatusAfter2, true)

        await contract.mint(bob, mintAmount, {from: admin}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Pausable: paused -- Reason given: Pausable: paused.")
        })
        const bobBalanceAfterStop = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfterStop, zeroBalance)
    });

    // role grant & revoke
    it('20. grant mint_burn role then call mint with setAuthority', async () => {
        const bobBalanceBefore1 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore1, zeroBalance)

        await contract.mint(bob, mintAmount, {from: bob}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Caller is not allowed to mint -- Reason given: Caller is not allowed to mint.")
        })

        const bobBalanceBefore2 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore2, zeroBalance)

        await contract.setAuthority(bob)

        const hasMintBurnRole = await contract.hasRole(MINT_BURN_ROLE, bob)
        assert.equal(hasMintBurnRole, true)

        await contract.mint(bob, mintAmount, {from: bob})

        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfter, mintAmount)
    });

    it('21. grant mint_burn role then call mint with grantMintBurnRole', async () => {
        const bobBalanceBefore1 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore1, zeroBalance)

        await contract.mint(bob, mintAmount, {from: bob}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Caller is not allowed to mint -- Reason given: Caller is not allowed to mint.")
        })

        const bobBalanceBefore2 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore2, zeroBalance)

        await contract.grantMintBurnRole(bob)

        const hasMintBurnRole = await contract.hasRole(MINT_BURN_ROLE, bob)
        assert.equal(hasMintBurnRole, true)

        await contract.mint(bob, mintAmount, {from: bob})

        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfter, mintAmount)
    });

    it('22. grant mint_burn role then call burn with setAuthority', async () => {
        await contract.mint(bob, mintAmount, {from: admin})
        const bobBalanceBefore1 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore1, mintAmount)

        await contract.burn(bob, burnAmount, {from: bob}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Caller is not allowed to burn -- Reason given: Caller is not allowed to burn.")
        })

        const bobBalanceBefore2 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore2, mintAmount)

        await contract.setAuthority(bob)

        const hasMintBurnRole = await contract.hasRole(MINT_BURN_ROLE, bob)
        assert.equal(hasMintBurnRole, true)

        await contract.burn(bob, burnAmount, {from: bob})

        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfter, leftOverAmount)
    });

    it('23. grant mint_burn role then call burn with grantMintBurnRole', async () => {
        await contract.mint(bob, mintAmount, {from: admin})
        const bobBalanceBefore1 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore1, mintAmount)

        await contract.burn(bob, burnAmount, {from: bob}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Caller is not allowed to burn -- Reason given: Caller is not allowed to burn.")
        })

        const bobBalanceBefore2 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore2, mintAmount)

        await contract.grantMintBurnRole(bob)

        const hasMintBurnRole = await contract.hasRole(MINT_BURN_ROLE, bob)
        assert.equal(hasMintBurnRole, true)

        await contract.burn(bob, burnAmount, {from: bob})

        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfter, leftOverAmount)
    });

    it('24. revoke mint_burn role then call mint', async () => {
        await contract.mint(bob, mintAmount, {from: admin})
        const bobBalanceBefore1 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore1, mintAmount)

        await contract.revokeMintBurnRole(admin)

        const hasMintBurnRole = await contract.hasRole(MINT_BURN_ROLE, admin)
        assert.equal(hasMintBurnRole, false)

        await contract.mint(bob, mintAmount, {from: admin}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Caller is not allowed to mint -- Reason given: Caller is not allowed to mint.")
        })

        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfter, mintAmount)
    });

    it('25. revoke mint_burn role then call burn', async () => {
        await contract.mint(bob, mintAmount, {from: admin})
        const bobBalanceBefore1 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore1, mintAmount)

        await contract.burn(bob, burnAmount, {from: admin})
        const bobBalanceBefore2 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore2, leftOverAmount)

        await contract.revokeMintBurnRole(admin)

        const hasMintBurnRole = await contract.hasRole(MINT_BURN_ROLE, admin)
        assert.equal(hasMintBurnRole, false)

        await contract.burn(bob, leftOverAmount, {from: admin}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Caller is not allowed to burn -- Reason given: Caller is not allowed to burn.")
        })

        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfter, leftOverAmount)
    });

    // max supply limitation
    it('26. max supply limitation', async () => {
        const initTotalSupply = await contract.totalSupply()
        assert.equal(initTotalSupply, 0)

        await contract.mint(admin, maxTotalSupply, {from: admin})
        const adminBalanceBefore1 = await contract.balanceOf(admin)
        assert.equal(adminBalanceBefore1, maxTotalSupply)

        const bobBalanceBefore1 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore1, zeroBalance)

        const totalSupply1 = await contract.totalSupply()
        assert.equal(totalSupply1, maxTotalSupply)

        await contract.mint(bob, mintAmount, {from: admin}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Exceeds SPWN token max totalSupply -- Reason given: Exceeds SPWN token max totalSupply.")
        })
        const bobBalance = await contract.balanceOf(bob)
        assert.equal(bobBalance, zeroBalance)

        const adminBalanceAfter = await contract.balanceOf(admin)
        assert.equal(adminBalanceAfter, maxTotalSupply)

        const totalSupply2 = await contract.totalSupply()
        assert.equal(totalSupply2, maxTotalSupply)

        await contract.burn(admin, mintAmount, {from: admin})

        await contract.mint(bob, mintAmount, {from: admin})
        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfter, mintAmount)

        const totalSupply3 = await contract.totalSupply()
        assert.equal(totalSupply3, maxTotalSupply)
    });

    // others
    it('27. admin role check', async () => {
        const ar = await contract.DEFAULT_ADMIN_ROLE()
        assert.equal(DEFAULT_ADMIN_ROLE, ar)
    });

    it('28. mint_burn role check', async () => {
        const mr = await contract.MINT_BURN_ROLE()
        assert.equal(MINT_BURN_ROLE, mr)
    });

    it('29. transfer before & after stop', async () => {
        const pauseStatusBefore1 = await contract.stopped()
        const pauseStatusBefore2 = await contract.paused()
        assert.equal(pauseStatusBefore1, pauseStatusBefore2)
        assert.equal(pauseStatusBefore2, false)

        await contract.mint(admin, mintAmount, {from: admin})
        const adminBalanceBefore = await contract.balanceOf(admin)
        assert.equal(adminBalanceBefore, mintAmount)

        const bobBalanceBeforeStop = await contract.balanceOf(bob)
        assert.equal(bobBalanceBeforeStop, zeroBalance)

        // transfer before stop
        await contract.transfer(bob, leftOverAmount, {from: admin})
        const bobBalanceBeforeStop2 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBeforeStop2, leftOverAmount)

        await contract.stop()

        const pauseStatusAfter1 = await contract.stopped()
        const pauseStatusAfter2 = await contract.paused()
        assert.equal(pauseStatusAfter1, pauseStatusAfter2)
        assert.equal(pauseStatusAfter2, true)

        // transfer after stop
        await contract.transfer(bob, leftOverAmount, {from: admin}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Pausable: paused -- Reason given: Pausable: paused.")
        })
        const bobBalanceAfterStop = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfterStop, leftOverAmount)
    });
});
