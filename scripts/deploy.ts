import { mkdir, writeFile } from "node:fs/promises";
import hardhat from "hardhat";
import { formatEther } from "viem";

async function main() {
  const { viem } = await hardhat.network.create();
  const client = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();
  if (!deployer) throw new Error("No deployment account. Set PRIVATE_KEY first.");

  const balance = await client.getBalance({ address: deployer.account.address });
  console.log(`Deployer: ${deployer.account.address} (${formatEther(balance)} gas)`);
  if (balance === 0n) throw new Error("The deployer has no Hadrian gas balance.");

  const comitia = await viem.deployContract("Comitia");
  const code = await client.getCode({ address: comitia.address });
  if (!code) throw new Error("Deployment completed without bytecode");

  console.log(`Comitia deployed: ${comitia.address}`);
  console.log(
    `Explorer: https://via-hadrian.testnet.romeprotocol.xyz/address/${comitia.address}`,
  );
  console.log(`NEXT_PUBLIC_COMITIA_ADDRESS=${comitia.address}`);

  await mkdir("deployments", { recursive: true });
  await writeFile(
    "deployments/hadrian.json",
    `${JSON.stringify(
      {
        chainId: 200010,
        comitia: comitia.address,
        deployer: deployer.account.address,
        deployedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
