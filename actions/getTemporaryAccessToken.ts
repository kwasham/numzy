'use server';

import { currentUser } from '@clerk/nextjs/server';

// initialize schematic sdk
import { SchematicClient } from '@schematichq/schematic-typescript-node';
const apiKey = process.env.SCHEMATIC_API_KEY;
const client = new SchematicClient({ apiKey });

// get a temporary access token for the user
export async function getTemporaryAccessToken() {
  try {
    const user = await currentUser();
    if (!user) {
      console.log('User not found');
      return null;
    }

    const resp = await client.accesstokens.issueTemporaryAccessToken({
      resourceType: 'company',
      lookup: { id: user.id },
    });
    console.log(resp.data ? 'Token received' : 'No token received');
    return resp.data?.token;
  } catch (error) {
    console.error('Error getting temporary access token:', error);
    return null;
  }
}
