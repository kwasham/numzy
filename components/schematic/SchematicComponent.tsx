import React from 'react';
import { getTemporaryAccessToken } from '@/actions/getTemporaryAccessToken';
import SchematicEmbed from './SchematicEmbed';

async function SchematicComponent({ componentId }: { componentId: string }) {
  if (!componentId) {
    return null;
  }

  try {
    const accessToken = await getTemporaryAccessToken();

    if (!accessToken) {
      return (
        <div className="p-4 text-center">
          <p className="text-gray-600">Please sign in to manage your plan.</p>
        </div>
      );
    }

    return (
      <SchematicEmbed accessToken={accessToken} componentId={componentId} />
    );
  } catch (error) {
    console.error('Error getting access token:', error);
    return (
      <div className="p-4 text-center">
        <p className="text-gray-600">Please sign in to manage your plan.</p>
      </div>
    );
  }
}

export default SchematicComponent;
