const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const BN = require('bignumber.js')
const ethers = require('ethers')
const config = require('./config.json')
const { getProvider } = require('./lib/support.js')
const axios = require('axios')

chai.use(chaiAsPromised)
expect = chai.expect
const HYDRO_DEPLOYER = require('hydro-meta-tx').deployer
const HYDRO_RELAYER = require('hydro-meta-tx').relayer
const HYDRO_API = require('hydro-meta-tx').api

const provider = getProvider()
const privateKey = config.privateKey

const deployer = new HYDRO_DEPLOYER({ provider, privateKey })
var contracts,
  erc20,
  relayerWallet,
  RELAYER,
  relayAPI,
  hydroInstance,
  clientWallet,
  clientSmartWallet

describe('Relayer Tests', function() {
  this.timeout(0)
  after(async () => {
    await RELAYER.stop()
  })
  it('Import Meta-Tx Smart Contracts from file', async () => {
    contracts = deployer.importContracts(config.contractsFile)
    erc20 = deployer.importERC20Contract(config.erc20File)

    expect(contracts.registry.address).to.be.not.undefined
    expect(contracts.factory.address).to.be.not.undefined
    expect(contracts.smartWallet.address).to.be.not.undefined
  })

  it('Create Random Relayer', async () => {
    relayerWallet = new ethers.Wallet.createRandom()

    let relayerOptions = {
      port: config.RELAYER_PORT,
      privateKey: relayerWallet.privateKey,
      providerAddress: config.PROVIDER_ADDRESS,
      infuraNetwork: config.INFURA_NETWORK,
      infuraAccessToken: config.INFURA_TOKEN,
    }

    RELAYER = new HYDRO_RELAYER()
    await RELAYER.start(relayerOptions, {
      level: config.loggerLevel,
      directory: config.loggerDirectory,
    })

    relayAPI = axios.create({
      baseURL: `http://localhost:${config.RELAYER_PORT}`,
      timeout: 3000000,
    })

    let response = await relayAPI.get('/relayerAddress')
    expect(response.data.relayer).to.be.equal(relayerWallet.address)
  })
  it('Send Ether to RELAYER', async () => {
    let ownerWallet = new ethers.Wallet(config.privateKey, provider)
    let tx = await ownerWallet.sendTransaction({
      to: relayerWallet.address,
      value: ethers.utils.parseEther('0.05'),
      // chainId:158372674
    })
    await tx.wait()
    let balance = await provider.getBalance(relayerWallet.address)
    console.log('Relayer Wallet Balance:', balance.toString())
    expect(balance.toString()).to.be.equal(
      ethers.utils.parseEther('0.05').toString(),
    )
  })

  it('Create Random Client Account and Mint Tokens', async () => {
    let tokenAmount = '100'
    clientWallet = new ethers.Wallet.createRandom()
    let tx = await erc20.contract.mint(clientWallet.address, tokenAmount)
    await tx.wait()

    let balance = await erc20.contract.balanceOf(clientWallet.address)
    expect(balance.toString()).to.be.equal(tokenAmount)
  })

  it('Create HYDRO_API Instance', async () => {
    let hydroOptions = {
      factoryAddress: contracts.factory.address,
      providerAddress: config.PROVIDER_ADDRESS,
      relayHost: `${config.RELAY_HOST}:${config.RELAYER_PORT}`,
      infuraNetwork: config.INFURA_NETWORK,
      infuraAccessToken: config.INFURA_TOKEN,
    }
    hydroInstance = new HYDRO_API.default(hydroOptions, {
      directory: config.loggerDirectory,
    })
    expect(hydroInstance).to.be.not.undefined
  })

  it('Create Smart Wallet instance for Client Account', async () => {
    clientSmartWallet = await hydroInstance.importPrivateKey(
      clientWallet.privateKey,
    )
    expect(clientSmartWallet.address).to.be.equal(clientWallet.address)
  })

  it("Mint token for client's Smart Wallet", async () => {
    let swAddress = await clientSmartWallet.queryCreate2Address()
    let tokenAmount = '999'
    let tx = await erc20.contract.mint(swAddress, tokenAmount)
    await tx.wait()

    let balance = await erc20.contract.balanceOf(swAddress)
    expect(balance.toString()).to.be.equal(tokenAmount)
  })

  it("Create Random Receiver Account and Transfer Tokens", async () => {
    let randomWallet = ethers.Wallet.createRandom()
    let tokenAmount = '100'
    let fee = '10'
    await clientSmartWallet.transfer({token:erc20.address,to:randomWallet.address,value:tokenAmount,fee:fee,gasprice:'1'})

    let balance = await erc20.contract.balanceOf(randomWallet.address)
    expect(balance.toString()).to.be.equal(tokenAmount)

    let relayerBalance = await erc20.contract.balanceOf(relayerWallet.address)
    expect(relayerBalance.toString()).to.be.equal(fee)

  })
})

// deployer.deployERC20().then((res) => {
//     console.log('Token address:', res)
// })
