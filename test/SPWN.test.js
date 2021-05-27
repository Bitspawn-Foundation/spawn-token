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
    const allowanceAmount = new BigNumber(50 * tokenAmountBase).toFixed()
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

    it('9.6. bob accepts the ownership', async () => {
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

    it('10. cetol accepts the ownership to himself after admin sets bob as pending owner', async () => {
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

    it('11.1. transfer: bob is in blackList and tries to transfer to cetol', async () => {
        // give bob some money
        await contract.mint(bob, mintAmount, {from: admin})
        const bobBalanceBefore = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore, mintAmount)

        // add bob to blackList
        await contract.addBlackList(bob, {from: admin})
        const bobBlackListStatus = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus, true)

        await contract.transfer(cetol, burnAmount, {from: bob}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Caller is in blackList -- Reason given: Caller is in blackList.")
        })

        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfter, mintAmount)
    });

    it('11.2. transfer: bob is in blackList and admin tries to transfer to bob', async () => {
        // give admin some money
        await contract.mint(admin, mintAmount, {from: admin})
        const adminBalanceBefore = await contract.balanceOf(admin)
        assert.equal(adminBalanceBefore, mintAmount)

        // add bob to blackList
        await contract.addBlackList(bob, {from: admin})
        const bobBlackListStatus = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus, true)

        await contract.transfer(bob, burnAmount, {from: admin}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert To address is in blackList -- Reason given: To address is in blackList.")
        })

        const adminBalanceAfter = await contract.balanceOf(admin)
        assert.equal(adminBalanceAfter, mintAmount)
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

    it('12.1. transferForm: allowance(bob=>cetol) bob is in blackList and cetol tries to transferFrom admin', async () => {
        const aTOb_allowanceBefore = await contract.allowance(bob, cetol)
        assert.equal(aTOb_allowanceBefore, zeroBalance)

        // approve 100 from bob to cetol
        await contract.approve(cetol, mintAmount, {from: bob})

        const aTOb_allowanceAfter = await contract.allowance(bob, cetol)
        assert.equal(aTOb_allowanceAfter, mintAmount)

        // add bob in blackList
        const bobBlackListStatus = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus, false)

        await contract.addBlackList(bob, {from: admin})

        const bobBlackListStatus2 = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus2, true)

        await contract.transferFrom(bob, cetol, burnAmount, {from: cetol}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert From address is in blackList -- Reason given: From address is in blackList.")
        })
    });

    it('12.2. transferForm: allowance(admin=>bob) bob is in blackList and bob tries to transferFrom admin', async () => {
        const aTOb_allowanceBefore = await contract.allowance(admin, bob)
        assert.equal(aTOb_allowanceBefore, zeroBalance)

        // approve 100 from admin to bob
        await contract.approve(bob, mintAmount, {from: admin})

        const aTOb_allowanceAfter = await contract.allowance(admin, bob)
        assert.equal(aTOb_allowanceAfter, mintAmount)

        // add bob in blackList
        const bobBlackListStatus = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus, false)

        await contract.addBlackList(bob, {from: admin})

        const bobBlackListStatus2 = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus2, true)

        await contract.transferFrom(admin, bob, burnAmount, {from: bob}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Caller is in blackList -- Reason given: Caller is in blackList.")
        })
    });

    it('13. admin increase allowance to bob with 100 SPWN', async () => {
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

    it('13.1. admin approves bob 100 SPWN', async () => {
        const aTOb_allowanceBefore = await contract.allowance(admin, bob)
        assert.equal(aTOb_allowanceBefore, zeroBalance)

        await contract.approve(bob, mintAmount, {from: admin})

        const aTOb_allowanceAfter = await contract.allowance(admin, bob)
        assert.equal(aTOb_allowanceAfter, mintAmount)
    });

    it('13.2. bob is in blackList and tries to approve cetol', async () => {
        const bobBlackListStatus = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus, false)

        await contract.addBlackList(bob, {from: admin})

        const bobBlackListStatus2 = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus2, true)

        await contract.approve(cetol, mintAmount, {from: bob}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Caller is in blackList -- Reason given: Caller is in blackList.");
        })
    });

    it('13.3. bob is in blackList and admin tries to approve bob', async () => {
        const bobBlackListStatus = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus, false)

        await contract.addBlackList(bob, {from: admin})

        const bobBlackListStatus2 = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus2, true)

        await contract.approve(bob, mintAmount, {from: admin}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Spender is in blackList -- Reason given: Spender is in blackList.");
        })
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

    it('17. bob destroys his 100 SPWN', async () => {
        await contract.mint(bob, mintAmount, {from: admin})
        const bobBalanceAfterMint = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfterMint, mintAmount)

        await contract.burn(burnAmount, {from: bob})
        const bobBalanceAfterBurn = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfterBurn, leftOverAmount)
    });

    it('18. admin approves bob 50 SPWN and bob destroys all 50 SPWN allowance from admin', async () => {
        // mint 100 to admin
        await contract.mint(admin, mintAmount, {from: admin})
        const adminBalanceAfterMint = await contract.balanceOf(admin)
        assert.equal(adminBalanceAfterMint, mintAmount)

        // admin approves 50 to bob
        await contract.approve(bob, allowanceAmount, {from: admin})

        const AdminToBobAllowance = await contract.allowance(admin, bob)
        assert.equal(AdminToBobAllowance, allowanceAmount)

        // bob burns 50 from admin=>bob allowance
        await contract.burnFrom(admin, allowanceAmount, {from: bob})

        // bob should have zero allowance in admin=>bob
        const AdminToBobAllowanceAfter = await contract.allowance(admin, bob)
        assert.equal(AdminToBobAllowanceAfter, zeroBalance)

        // admin should have 50 left in balance
        const adminBalanceAfterBurnFrom = await contract.balanceOf(admin)
        assert.equal(adminBalanceAfterBurnFrom, allowanceAmount)
    });

    it('18.1. admin approves bob 50 SPWN and bob tries to destroy 100 SPWN allowance from admin', async () => {
        // mint 100 to admin
        await contract.mint(admin, mintAmount, {from: admin})
        const adminBalanceAfterMint = await contract.balanceOf(admin)
        assert.equal(adminBalanceAfterMint, mintAmount)

        // admin approves 50 to bob
        contract.approve(bob, allowanceAmount, {from: admin})

        const AdminToBobAllowance = await contract.allowance(admin, bob, {from: admin})
        assert.equal(AdminToBobAllowance, allowanceAmount)

        // bob burns 50 from admin=>bob allowance
        await contract.burnFrom(admin, mintAmount, {from: bob}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert ERC20: burn amount exceeds allowance -- Reason given: ERC20: burn amount exceeds allowance.");
        })

        // bob should have 50 allowance in admin=>bob
        const AdminToBobAllowanceAfter = await contract.allowance(admin, bob, {from: admin})
        assert.equal(AdminToBobAllowanceAfter, allowanceAmount)

        // admin should have 100 left in balance
        const adminBalanceAfterBurnFrom = await contract.balanceOf(admin)
        assert.equal(adminBalanceAfterBurnFrom, mintAmount)
    });

    it('18.2. add bob to blackList then mint to him', async () => {
        const bobBlackListStatus = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus, false)

        await contract.addBlackList(bob, {from: admin})

        const bobBlackListStatus2 = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus2, true)

        await contract.mint(bob, mintAmount, {from: admin}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert To address is in blackList -- Reason given: To address is in blackList.");
        })
    });

    it('18.3. add bob to blackList then mint to cetol', async () => {
        const bobBlackListStatus = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus, false)

        await contract.addBlackList(bob, {from: admin})

        const bobBlackListStatus2 = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus2, true)

        await contract.mint(cetol, mintAmount, {from: bob}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Caller is in blackList -- Reason given: Caller is in blackList.");
        })
    });

    it('18.4. bob tries to destroy after been added to blackList', async () => {
        // mint 100 to bob
        await contract.mint(bob, mintAmount, {from: admin})
        const bobBalanceAfterMint = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfterMint, mintAmount)

        // add bob in blackList
        const bobBlackListStatus = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus, false)

        await contract.addBlackList(bob, {from: admin})

        const bobBlackListStatus2 = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus2, true)

        await contract.destroy(mintAmount, {from: bob}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Caller is in blackList -- Reason given: Caller is in blackList.");
        })
    });

    it('18.5. bob tries to destroy his allowance from admin after been added to blackList', async () => {
        // admin approves 50 SPWN to bob
        await contract.approve(bob, allowanceAmount, {from: admin})

        const AdminToBobAllowance = await contract.allowance(admin, bob)
        assert.equal(AdminToBobAllowance, allowanceAmount)

        // add bob in blackList
        const bobBlackListStatus = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus, false)

        await contract.addBlackList(bob, {from: admin})

        const bobBlackListStatus2 = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus2, true)

        await contract.destroyFrom(admin, allowanceAmount, {from: bob}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Caller is in blackList -- Reason given: Caller is in blackList.");
        })
    });

    it('18.6. bob is not owner and tries to call destroyBlackFunds', async () => {
        await contract.destroyBlackFunds(admin, {from: bob}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.");
        })
    });

    it('18.7. bob is in blackList and admin calls destroyBlackFunds on bob', async () => {
        // mint 100 to bob
        await contract.mint(bob, mintAmount, {from: admin})
        const bobBalanceAfterMint = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfterMint, mintAmount)

        // add bob in blackList
        const bobBlackListStatus = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus, false)

        await contract.addBlackList(bob, {from: admin})

        const bobBlackListStatus2 = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus2, true)

        // destroyBlackFunds for bob
        await contract.destroyBlackFunds(bob, {from: admin})

        // bob has zero balance
        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfter, zeroBalance)
    });

    it('18.8. bob is not in blackList and admin calls destroyBlackFunds on bob', async () => {
        // mint 100 to bob
        await contract.mint(bob, mintAmount, {from: admin})
        const bobBalanceAfterMint = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfterMint, mintAmount)

        // make sure bob is not in blackList
        const bobBlackListStatus = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus, false)

        // destroyBlackFunds for bob
        await contract.destroyBlackFunds(bob, {from: admin}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Address is not in the blackList -- Reason given: Address is not in the blackList.");
        })

        // bob still has 100 balance
        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfter, mintAmount)
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

    it('22. revoke mint_burn role then call mint', async () => {
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

    // max supply limitation
    it('23. max supply limitation', async () => {
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

        await contract.destroy(mintAmount, {from: admin})

        await contract.mint(bob, mintAmount, {from: admin})
        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfter, mintAmount)

        const totalSupply3 = await contract.totalSupply()
        assert.equal(totalSupply3, maxTotalSupply)
    });

    // others
    it('24. admin role check', async () => {
        const ar = await contract.DEFAULT_ADMIN_ROLE()
        assert.equal(DEFAULT_ADMIN_ROLE, ar)
    });

    it('25. mint_burn role check', async () => {
        const mr = await contract.MINT_BURN_ROLE()
        assert.equal(MINT_BURN_ROLE, mr)
    });

    it('26. transfer before & after stop', async () => {
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

    // black list
    it('27. add bob in blackList', async () => {
        const bobBlackListStatus = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus, false)

        await contract.addBlackList(bob, {from: admin})

        const bobBlackListStatus2 = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus2, true)
    });

    it('28. remove bob from blackList', async () => {
        const bobBlackListStatus = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus, false)

        await contract.addBlackList(bob, {from: admin})

        const bobBlackListStatus2 = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus2, true)

        await contract.removeBlackList(bob)

        const bobBlackListStatus3 = await contract.getBlackListStatus(bob)
        assert.equal(bobBlackListStatus3, false)
    });

    it('29. add owner in blackList', async () => {
        const currentOwner = await contract.owner()
        assert.equal(currentOwner, admin)

        const adminBlackListStatus = await contract.getBlackListStatus(admin)
        assert.equal(adminBlackListStatus, false)

        await contract.addBlackList(admin, {from: admin}).catch(err => {
            assert.equal(err.toString(), "Error: Returned error: VM Exception while processing transaction: revert Can not add owner to blackList -- Reason given: Can not add owner to blackList.");
        })
    });
});
