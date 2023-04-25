import { TypedDataDomain, ethers } from "ethers";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";

// config for sign message on blockchain
export const DATA_DOMAIN_NAME = "SNews";
export const DATA_DOMAIN_VERSION = "v1.0";
export async function ServerSignature(
  snews_contract_address: string,
  from: string,
  totalSupply: string,
  tokenId: number,
  nonce: number,
  slug: string,
  signer: SignerWithAddress
) {

    console.log("SNEW address: ", snews_contract_address)
  const domain: TypedDataDomain = {
    name: DATA_DOMAIN_NAME,
    version: DATA_DOMAIN_VERSION,
    verifyingContract: snews_contract_address,
  };

  const types = {
    Claim: [
      { name: "from", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "value", type: "uint256" },
    ],
  };
  const message = {
    from: from,
    tokenId: tokenId,
    nonce: nonce,
    value: ethers.utils.parseEther(totalSupply),
  };

  let signMessage = await signer._signTypedData(domain, types, message);

  let signMessageSpit = ethers.utils.splitSignature(signMessage);
  return {
    r: signMessageSpit.r,
    v: signMessageSpit.v,
    s: signMessageSpit.s,
    transaction_id: "transaction#01",
    slug: slug,
  };
}
