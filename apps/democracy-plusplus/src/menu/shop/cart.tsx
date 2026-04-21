import { useEffect, useRef, useState } from "react";
import {
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Button,
  Typography,
  Badge,
  FormLabel,
  ListItemIcon,
} from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { useDispatch, useSelector } from "react-redux";
import { selectShop, removeFromCart, clearCart, buyCart } from "../../slices/shopSlice";
import { subtractCredits, selectCredits } from "../../slices/creditsSlice";
import { addPurchased } from "../../slices/purchasedSlice";
import { setSnackbar } from "../../slices/snackbarSlice";
import { addPurchaseLogEntry } from "../../slices/logSlice";
import { ItemIcon } from "../../utils/itemDisplay";
import type { ItemCategory, ShopItem } from "../../types";

export default function CartManager() {
  const dispatch = useDispatch();
  const { cart } = useSelector(selectShop);
  const { credits } = useSelector(selectCredits);
  const [open, setOpen] = useState(false);
  const [pulseCart, setPulseCart] = useState(false);
  const previousTotalItems = useRef(cart.length);

  const totalCost = cart.reduce((sum, item) => sum + item.cost, 0);
  const affordable = totalCost <= credits;
  const totalItems = cart.length;

  useEffect(() => {
    if (totalItems > previousTotalItems.current) {
      setPulseCart(true);
      const timeout = window.setTimeout(() => setPulseCart(false), 280);
      previousTotalItems.current = totalItems;
      return () => window.clearTimeout(timeout);
    }

    previousTotalItems.current = totalItems;
    return undefined;
  }, [totalItems]);

  function handleClear() {
    dispatch(clearCart());
    setOpen(false);
  }

  function handleCheckout() {
    if (!affordable) {
      dispatch(setSnackbar({ message: "Not enough credits!", severity: 'error' }));
      return;
    }

    const purchasedNames = cart.map(i => i.displayName);

    dispatch(subtractCredits({ amount: totalCost }));
    cart.forEach((item) => {
      dispatch(addPurchased({ value: item.displayName }));
      dispatch(addPurchaseLogEntry({
        kind: 'purchase',
        id: `purchase-${Date.now()}-${item.displayName}-${item.cost}`,
        timestamp: new Date().toISOString(),
        itemDisplayName: item.displayName,
        cost: item.cost,
      }));
    });
    dispatch(buyCart());
    dispatch(setSnackbar({ message: `Purchased ${cart.length} items!` }));

    setOpen(false);
  }

  const categorisedCart = Object.groupBy(cart, (item) => item.category ?? "crate") as Partial<Record<ItemCategory, ShopItem[]>>;

  return (
    <>
      <Fab
        color="primary"
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          animation: pulseCart ? "cartPulse 280ms ease-out" : "none",
          "@keyframes cartPulse": {
            "0%": { transform: "scale(1)" },
            "35%": { transform: "scale(1.14)" },
            "100%": { transform: "scale(1)" },
          },
        }}
        onClick={() => setOpen(true)}
      >
        <Badge
          badgeContent={totalItems}
          color="error"
          invisible={totalItems === 0}
          overlap="circular"
        >
          <ShoppingCartIcon />
        </Badge>
      </Fab>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cart</DialogTitle>
        <DialogContent>
          {cart.length === 0 ? (
            <Typography variant="body1">Your cart is empty.</Typography>
          ) : (
            <>
              <CartCategory category="armor" value="Armor Passives" />
              <CartCategory category="booster" value="Boosters" />
              <CartCategory category="primary" value="Primaries" />
              <CartCategory category="secondary" value="Secondaries" />
              <CartCategory category="throwable" value="Throwables" />
              <CartCategory category="Eagle" value="Eagles" />
              <CartCategory category="Orbital" value="Orbitals" />
              <CartCategory category="Supply" value="Supplies" />
              <CartCategory category="Defense" value="Defenses" />
              <CartCategory category="crate" value="Supply Crates" />
            </>
          )}
          <Typography color={affordable ? "success" : "error"}>
            {totalCost}¢ Total
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClear} color="warning" disabled={cart.length === 0}>
            Clear
          </Button>
          <Button onClick={handleCheckout} color="success" disabled={cart.length === 0 || !affordable}>
            Checkout
          </Button>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );

  function CartCategory({ category, value }: { category: ItemCategory; value: string }) {
    const categoryItems = categorisedCart[category];

    if (!categoryItems || !categoryItems.length) {
      return null;
    }

    return <List>
      <FormLabel component="legend">{value}</FormLabel>
      {categoryItems.map((item) => (
        <ListItem
          key={item.displayName}
          secondaryAction={<Button
            color="error"
            size="small"
            onClick={() => dispatch(removeFromCart({ value: item }))}
          >
            Remove
          </Button>}
        >
          <ListItemIcon>
            <ItemIcon item={item} width={55} minHeight={40} margin={1} bgcolor='black' />
          </ListItemIcon>
          <ListItemText
            primary={`${item.displayName}`}
            secondary={`${item.cost}¢`} />
        </ListItem>
      ))}
    </List>;
  }
}
