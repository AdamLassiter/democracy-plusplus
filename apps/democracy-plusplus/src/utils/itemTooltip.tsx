import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { Item, PropertyValue } from "../types";

type PropertyEntry = [string, string | number | boolean | null];

function hasProperties(item: Item | undefined) {
  return item?.properties && Object.keys(item.properties).length > 0;
}

function isPrimitive(value: PropertyValue): value is string | number | boolean | null {
  return value === null || typeof value !== "object";
}

function cleanLabel(label: string) {
  return String(label).replace(/^\*+\s*/, "");
}

function isPropertyEntry(entry: [string, PropertyValue]): entry is PropertyEntry {
  return isPrimitive(entry[1]);
}

function PropertyTable({ rows }: { rows: PropertyEntry[] }) {
  return (
    <TableContainer>
      <Table
        size="small"
        sx={{
          "& td": {
            borderColor: "rgba(255, 255, 255, 0.12)",
            px: 1,
            py: 0.5,
            verticalAlign: "top",
          },
          "& tr:last-child td": {
            borderBottom: 0,
          },
        }}
      >
        <TableBody>
          {rows.map(([key, value]) => (
            <TableRow key={key}>
              <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                {cleanLabel(key)}
              </TableCell>
              <TableCell>{String(value)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function PropertySection({ title, value, depth = 0 }: { title?: string; value: PropertyValue; depth?: number }) {
  if (isPrimitive(value)) {
    return null;
  }

  const entries = Object.entries(value);
  if (!entries.length) {
    return null;
  }

  const primitiveRows = entries.filter(isPropertyEntry);
  const nestedRows = entries.filter((entry) => !isPropertyEntry(entry));

  return (
    <Box sx={{ mt: depth === 0 ? 0 : 1.25 }}>
      {title && (
        <Typography
          variant={depth === 0 ? "subtitle2" : "body2"}
          sx={{
            fontWeight: 700,
            mb: 0.5,
            textTransform: depth === 0 ? "uppercase" : "none",
            letterSpacing: depth === 0 ? 0.4 : 0,
          }}
        >
          {cleanLabel(title)}
        </Typography>
      )}
      {primitiveRows.length > 0 && <PropertyTable rows={primitiveRows} />}
      {nestedRows.map(([key, nestedValue]) => (
        <PropertySection
          key={key}
          title={key}
          value={nestedValue}
          depth={depth + 1}
        />
      ))}
    </Box>
  );
}

export default function ItemTooltip({ item, children }: { item: Item; children: ReactNode }) {
  if (!hasProperties(item)) {
    return children;
  }

  return (
    <Tooltip
      title={(
        <Box sx={{ maxHeight: 400, maxWidth: 420, overflow: "auto", p: 1 }}>
          {Object.entries(item.properties ?? {}).map(([sectionTitle, sectionValue]) => (
            <PropertySection
              key={sectionTitle}
              title={sectionTitle}
              value={sectionValue}
            />
          ))}
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
