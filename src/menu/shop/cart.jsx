import { useState } from "react";
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
import { selectShop, removeFromCart, clearCart } from "../../slices/shopSlice";
import { subtractCredits, selectCredits } from "../../slices/creditsSlice";
import { addPurchased } from "../../slices/purchasedSlice";
import { setSnackbar } from "../../slices/snackbarSlice";
import { ItemIcon } from "../../itemDisplay";

export default function CartManager() {
  const dispatch = useDispatch();
  const { cart } = useSelector(selectShop);
  const { credits } = useSelector(selectCredits);
  const [open, setOpen] = useState(false);

  const totalCost = cart.reduce((sum, item) => sum + item.cost, 0);
  const affordable = totalCost <= credits;
  const totalItems = cart.length;

  function handleClear() {
    dispatch(clearCart());
  }

  function handleCheckout() {
    if (!affordable) {
      dispatch(setSnackbar({ message: "Not enough credits!", severity: 'error' }));
      return;
    }

    const purchasedNames = cart.map(i => i.displayName);

    dispatch(subtractCredits({ amount: totalCost }));
    purchasedNames.forEach(purchasedName => dispatch(addPurchased({ value: purchasedName })));
    dispatch(clearCart());
    dispatch(setSnackbar({ message: `Purchased ${cart.length} items!` }));

    setOpen(false);
  }

  const categorisedCart = Object.groupBy(cart, (item) => item.category);

  return (
    <>
      <Fab
        color="primary"
        aria-label="cart"
        sx={{ position: "fixed", bottom: 24, right: 24 }}
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

  function CartCategory({ category, value }) {
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
