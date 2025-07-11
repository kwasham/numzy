'use client';

import {
  SchematicEmbed as SchematicEmbedComponent,
  EmbedProvider,
} from '@schematichq/schematic-components';

interface SchematicEmbedProps {
  accessToken: string;
  componentId: string;
}

function SchematicEmbed({ accessToken, componentId }: SchematicEmbedProps) {
  console.log(accessToken);
  return (
    <EmbedProvider>
      <SchematicEmbedComponent accessToken={accessToken} id={componentId} />
    </EmbedProvider>
  );
}

export default SchematicEmbed;
