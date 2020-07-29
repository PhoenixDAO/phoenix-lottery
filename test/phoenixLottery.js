const assert = require('assert')
const fs = require('fs')
const { join } = require('path')
const Web3 = require('web3')
// const infura = 'wss://ropsten.infura.io/ws/v3/f7b2c280f3f440728c2b5458b41c663d'
const infura = 'http://localhost:8545'
const abi = JSON.parse(fs.readFileSync(join(__dirname, '../build', 'contracts', 'Randomizer.json'))).abi
const IdentityRegistry = artifacts.require('IdentityRegistry')
const PhoenixTokenTestnet = artifacts.require('PhoenixTokenTestnet')
const Randomizer = artifacts.require('Randomizer')
const PhoenixLottery = artifacts.require('PhoenixLottery')
const phoenixLotteryABI = JSON.parse(fs.readFileSync(join(__dirname, '../build/contracts', 'PhoenixLottery.json')))
let phoenixToken = {}
let identityRegistry = {}
let phoenixLottery = {}
let randomizer = {}
let randomizerEvents = {}

// 1. Write tests to deploy the token contract with truffle on ganache
// 2. Deploy the identity registry
// 3. Get an EIN for my account since it’s necessary
// 4. Get tokens since we need them
// 5. Run the createLottery function
// Do test random key generation with my own oracle instead of oraclize since oraclize is expensive. When the tests are completed, deploy it to ropsten or rinkeby and use the real oraclize although it may only work on mainnet, test that.
contract('PhoenixLottery', accounts => {
    // Deploy a new PhoenixLottery, Token and Registry before each test to avoid messing shit up while creatin an EIN and getting tokens
    beforeEach(async () => {
        web3 = new Web3(new Web3.providers.WebsocketProvider(infura))
        console.log('Deploying new phoenix token...')
        phoenixToken = await PhoenixTokenTestnet.new({gas: 8e6})
        console.log('Deployed phoenix token', phoenixToken.address)
        console.log('Deploying new identity registry...')
        identityRegistry = await IdentityRegistry.new({gas: 8e6})
        console.log('Deployed registry', identityRegistry.address)
        console.log('Deploying new randomizer...')
        randomizer = await Randomizer.new({gas: 8e6})
        console.log('Deployed randomizer', randomizer.address)
        console.log('Deploying new phoenix lottery...')
        phoenixLottery = await PhoenixLottery.new(identityRegistry.address, phoenixToken.address, randomizer.address, {gas: 8e6})
        console.log('Deployed lottery', phoenixLottery.address)

        // Listen to events on the randomizer contract
        randomizerEvents = new web3.eth.Contract(abi, randomizer.address)
        console.log('Randomizer events address', randomizer.address)
        randomizerEvents.events.SetPhoenixLotteryAddress().on('data', newEvent => {
            console.log('The Phoenix Lottery has been setup')
        })

        console.log('Setting lottery on randomizer')
        // Set Phoenix Lottery's address inside our Randomizer instance
        await randomizer.setPhoenixLottery(phoenixLottery.address, {gas: 8e6})
        console.log('Creating identity one')
        // EIN 1
        await identityRegistry.createIdentity(accounts[0], [accounts[1]], [accounts[1]], {gas: 8e6})
        console.log('Creating identity two')
        // EIN 2
        await identityRegistry.createIdentity(accounts[1], [accounts[2]], [accounts[2]], { from: accounts[1], gas: 8e6 })
    })

    it('Should create a new lottery', async () => {
        const id = 0
        const name = fillBytes32WithSpaces('Example')
        const description = 'This is an example'
        const phoenixPrice = 100
        const phoenixReward = 1000
        const startTime = Math.floor(new Date().getTime() / 1000) + 1e3
        const endTime = Math.floor(new Date().getTime() / 1000) + 1e6
        const fee = 10
        const feeReceiver = accounts[0]
        const ein = parseInt(await identityRegistry.getEIN(accounts[0]))

        // Then do the right approval
        await phoenixToken.approve(phoenixLottery.address, phoenixReward, {
            from: accounts[0],
            gas: 8e6
        })

        // bytes32 _name, string memory _description, uint256 _phoenixPricePerTicket, uint256 _phoenixReward, uint256 _beginningTimestamp, uint256 _endTimestamp, uint256 _fee, address payable _feeReceiver
        await phoenixLottery.createLottery(name, description, phoenixPrice, phoenixReward, startTime, endTime, fee, feeReceiver, {
            from: accounts[0],
            gas: 8e6
        })
        const lottery = await phoenixLottery.lotteryById(0)

        // lottery.id, lottery.name, lottery.description, lottery.phoenixPrice, lottery.phoenixReward, lottery.beginningDate, lottery.endDate, lottery.einOwner, lottery.fee, lottery.feeReceiver, lottery.escrowContract, lottery.einWinner
        assert.equal(id, lottery.id, 'The lottery ID has not been setup properly')
        assert.equal(name, lottery.name, 'The lottery name has not been setup properly')
        assert.equal(description, lottery.description, 'The lottery description has not been setup properly')
        assert.equal(phoenixPrice, lottery.phoenixPrice, 'The lottery price has not been setup properly')
        assert.equal(phoenixReward, lottery.phoenixReward, 'The lottery reward has not been setup properly')
        assert.equal(startTime, lottery.beginningDate, 'The lottery start time has not been setup properly')
        assert.equal(endTime, lottery.endDate, 'The lottery end time has not been setup properly')
        assert.equal(ein, lottery.einOwner, 'The lottery EIN owner has not been setup properly')
        assert.equal(fee, lottery.fee, 'The lottery fee has not been setup properly')
    })

    it('Should move the phoenix token reward to the escrow contract when creating a new lottery', async () => {
        const id = 0
        const name = fillBytes32WithSpaces('Example')
        const description = 'This is an example'
        const phoenixPrice = 100
        const phoenixReward = 1000
        const startTime = Math.floor(new Date().getTime() / 1000) + 1e3
        const endTime = Math.floor(new Date().getTime() / 1000) + 1e6
        const fee = 10
        const feeReceiver = accounts[0]
        const ein = parseInt(await identityRegistry.getEIN(accounts[0]))

        // Then do the right approval
        await phoenixToken.approve(phoenixLottery.address, phoenixReward, {
            from: accounts[0],
            gas: 8e6
        })

        // bytes32 _name, string memory _description, uint256 _phoenixPricePerTicket, uint256 _phoenixReward, uint256 _beginningTimestamp, uint256 _endTimestamp, uint256 _fee, address payable _feeReceiver
        await phoenixLottery.createLottery(name, description, phoenixPrice, phoenixReward, startTime, endTime, fee, feeReceiver, {
            from: accounts[0],
            gas: 8e6
        })
        const lottery = await phoenixLottery.lotteryById(0)
        const escrowTokenBalance = parseInt(await phoenixToken.balanceOf(lottery.escrowContract))

        // lottery.id, lottery.name, lottery.description, lottery.phoenixPrice, lottery.phoenixReward, lottery.beginningDate, lottery.endDate, lottery.einOwner, lottery.fee, lottery.feeReceiver, lottery.escrowContract, lottery.einWinner
        assert.equal(escrowTokenBalance, phoenixReward, 'The token balance inside the escrow contract must be the phoenix reward when deploying a new lottery')
    })

    it('Should buy a ticket for a lottery successfully with enough funds', async () => {
        const id = 0
        const phoenixPrice = 100
        const ein = parseInt(await identityRegistry.getEIN(accounts[0]))
        const name = fillBytes32WithSpaces('Example')
        const description = 'This is an example'
        const phoenixReward = 1000
        const startTime = Math.floor(new Date().getTime() / 1000) + 1e3
        const endTime = Math.floor(new Date().getTime() / 1000) + 1e6
        const fee = 10
        const feeReceiver = accounts[0]
        // Then do the right approval
        await phoenixToken.approve(phoenixLottery.address, phoenixReward, {
            from: accounts[0],
            gas: 8e6
        })

        // bool _id, bytes32 _name, string memory _description, uint256 _phoenixPricePerTicket, uint256 _phoenixReward, uint256 _beginningTimestamp, uint256 _endTimestamp, uint256 _fee, address payable _feeReceiver
        await phoenixLottery.createLottery(name, description, phoenixPrice, phoenixReward, startTime, endTime, fee, feeReceiver, {
            from: accounts[0],
            gas: 8e6
        })

        // Buy 2 lottery tickets to properly check the id since the first once is zero
        const lottery = await phoenixLottery.lotteryById(id)

        // Then do the right approval
        await phoenixToken.approve(phoenixLottery.address, phoenixPrice, {
            from: accounts[0],
            gas: 8e6
        })
        await phoenixLottery.buyTicket(lottery.id, {
            from: accounts[0],
            gas: 8e6
        })

        // Transfer tokens to the second account so he can buy some
        await phoenixToken.transfer(accounts[1], 100, {
            from: accounts[0],
            gas: 8e6
        })
        // Then do the right approval
        await phoenixToken.approve(phoenixLottery.address, phoenixPrice, {
            from: accounts[1],
            gas: 8e6
        })
        await phoenixLottery.buyTicket(lottery.id, {
            from: accounts[1],
            gas: 8e6
        })

        const secondEin = parseInt(await identityRegistry.getEIN(accounts[1]))
        const secondEinTicket = parseInt(await phoenixLottery.getTicketIdByEin(id, secondEin))
        const totalTickets = (await phoenixLottery.getEinsParticipatingInLottery(id)).length
        assert.equal(secondEinTicket, 1, 'The lottery Id of the second ticket must be one to confirm that is has been purchased')
        assert.equal(totalTickets, 2, 'There must be two tickets purchased')
    })

    it('Should end a lottery after the time runs out with the raffle() function', async () => {
        const lotteryId = 0
        const phoenixPrice = 100
        const ein = parseInt(await identityRegistry.getEIN(accounts[0]))
        const name = fillBytes32WithSpaces('Example')
        const description = 'This is an example'
        const phoenixReward = 1000
        const startTime = Math.floor(new Date().getTime() / 1000)
        const endTime = Math.floor(new Date().getTime() / 1000) + 50 // 500 seconds after now
        const fee = 10
        const feeReceiver = accounts[0]
        let counterTime = Math.floor(new Date().getTime() / 1000)
        let approval
        let transaction

        randomizerEvents.events.QueryRandom().on('data', newEvent => {
            console.log('Oraclize will run:', newEvent.returnValues.message)
        })
        randomizerEvents.events.GeneratedRandom().on('data', newEvent => {
            console.log('Generated random', newEvent.returnValues)
        })

        console.log('Setting up ein 3...')
        // EIN 3
        transaction = identityRegistry.createIdentity(accounts[2], [accounts[3]], [accounts[3]], { from: accounts[2], gas: 8e6 })
        await waitFiveConfirmations(transaction)
        console.log('Setting up ein 4...')
        // EIN 4
        transaction = identityRegistry.createIdentity(accounts[3], [accounts[4]], [accounts[4]], { from: accounts[3], gas: 8e6 })
        await waitFiveConfirmations(transaction)

        console.log('Creating lottery\'s approval...')
        transaction = phoenixToken.approve(phoenixLottery.address, phoenixReward, {
            from: accounts[0],
            gas: 8e6
        })
        await waitFiveConfirmations(transaction)
        console.log('Creating lottery...')
        transaction = phoenixLottery.createLottery(name, description, phoenixPrice, phoenixReward, startTime, endTime, fee, feeReceiver, {
            from: accounts[0],
            gas: 8e6
        })
        await waitFiveConfirmations(transaction)

        console.log('Buying ticket 1 transfer...')
        // Transfer tokens to the second account so he can buy some
        transaction = phoenixToken.transfer(accounts[1], phoenixPrice, {
            from: accounts[0],
            gas: 8e6
        })
        await waitFiveConfirmations(transaction)
        console.log('Buying ticket 1 approve...')
        transaction = phoenixToken.approve(phoenixLottery.address, phoenixPrice, {
            from: accounts[1],
            gas: 8e6
        })
        await waitFiveConfirmations(transaction)
        console.log('Buying ticket 1 buy...')
        transaction = phoenixLottery.buyTicket(lotteryId, {
            from: accounts[1],
            gas: 8e6
        })
        await waitFiveConfirmations(transaction)

        console.log('Buying ticket 2 transfer...')
        // Transfer tokens to the third account so he can buy some
        transaction = phoenixToken.transfer(accounts[2], phoenixPrice, {
            from: accounts[0],
            gas: 8e6
        })
        await waitFiveConfirmations(transaction)
        console.log('Buying ticket 2 approve...')
        transaction = phoenixToken.approve(phoenixLottery.address, phoenixPrice, {
            from: accounts[2],
            gas: 8e6
        })
        await waitFiveConfirmations(transaction)
        console.log('Buying ticket 2 buy...')
        transaction = phoenixLottery.buyTicket(lotteryId, {
            from: accounts[2],
            gas: 8e6
        })
        await waitFiveConfirmations(transaction)

        console.log('Buying ticket 3 transfer...')
        // Transfer tokens to the fourth account so he can buy some
        transaction = phoenixToken.transfer(accounts[3], phoenixPrice, {
            from: accounts[0],
            gas: 8e6
        })
        await waitFiveConfirmations(transaction)
        console.log('Buying ticket 3 approve...')
        transaction = phoenixToken.approve(phoenixLottery.address, phoenixPrice, {
            from: accounts[3],
            gas: 8e6
        })
        await waitFiveConfirmations(transaction)
        console.log('Buying ticket 3 buy...')
        transaction = phoenixLottery.buyTicket(lotteryId, {
            from: accounts[3],
            gas: 8e6
        })
        await waitFiveConfirmations(transaction)

        // If the contract time has not been reached yet, wait a bit
        while(counterTime < endTime) {
            console.log('Counter', counterTime, 'End time', endTime)
            counterTime = Math.floor(new Date().getTime() / 1000) + 5
            await asyncSetTimeout(5e3)
        }

        console.log('Running raffle after time is up...')
        transaction = phoenixLottery.raffle(lotteryId, {
            gas: 8e6,
            value: "100000000000000000"
        })
        await waitFiveConfirmations(transaction)

        console.log('Waiting 100 seconds for oraclize to catch up')
        await asyncSetTimeout(1e3 * 100) // Wait 100 seconds for oraclize to generate the random number since it takes some time to receive the query, process the query and confirm the transaction with the result on the blockchain

        const lottery = await phoenixLottery.lotteryById(lotteryId)
        console.log('Ein winner', parseInt(lottery.einWinner))
        console.log('Lottery is finished', lottery.isFinished)
        assert.ok(lottery.isFinished, 'The lottery must be finished')
    })
})

function waitFiveConfirmations(transaction) {
    return new Promise((resolve, reject) => {
        try {
            transaction.on('confirmation', confirmationNumber => {
                if(confirmationNumber >= 2) resolve()
            })
            transaction.on('error', e => {
                reject(e)
            })
        } catch(e) {
            reject(e)
        }
    })
}

function asyncSetTimeout(time) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, time)
    })
}

// To test bytes32 functions
function fillBytes32WithSpaces(name) {
    let nameHex = web3.utils.toHex(name)
    for(let i = nameHex.length; i < 66; i++) {
        nameHex = nameHex + '0'
    }
    return nameHex
}
