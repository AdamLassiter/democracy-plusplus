import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';

export default function ItemTooltip({ item, children }) {
  const tooltipContent = (
    <Box sx={{ maxHeight: 400, maxWidth: 360, overflow: 'auto', p: 1 }}>
      <div
        className="wiki-tooltip-content"
        dangerouslySetInnerHTML={{ __html: item.hoverTexts }}
      />
    </Box>
  );

  if (!item?.hoverTexts?.length) {
    return children;
  }

  return (
    <Tooltip
      title={tooltipContent}
      enterDelay={600}
      leaveDelay={150}
      arrow
      disableInteractive={false}
    >
      {children}
    </Tooltip>
  );
}
