'use client';

import {
  SchematicEmbed as SchematicEmbedComponent,
  EmbedProvider,
} from '@schematichq/schematic-components';

function SchematicEmbed({
  accessToken,
  componentId,
}) {
  console.log(accessToken);
  return (
  <EmbedProvider>
    <SchematicEmbedComponent accessToken={accessToken} id={componentId} />
  </EmbedProvider>
  )
}

export default SchematicEmbed;
