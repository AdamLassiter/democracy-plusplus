import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';

export default function ItemTooltip({ item, children }) {
  if (!item?.hoverTexts?.length) {
    return children;
  }

  return (
    <Tooltip
      title={(
        <Box sx={{ maxHeight: 400, maxWidth: 400, overflow: 'auto', p: 1 }}>
          <div
            className="wiki-tooltip-content"
            dangerouslySetInnerHTML={{ __html: item.hoverTexts }}
          />
        </Box>
      )}
      enterDelay={600}
      leaveDelay={150}
      disableInteractive={false}
    >
      {/* Need a component that can take a ref, so wrap in <div />*/}
      <div>
        {children}
      </div>
    </Tooltip>
  );
}
