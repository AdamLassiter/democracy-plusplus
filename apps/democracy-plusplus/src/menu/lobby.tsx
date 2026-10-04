import type { Dispatch, SetStateAction } from 'react';
import { Button, Dialog, DialogActions, DialogContent, TextField } from '@mui/material';
import CloseableDialogTitle from '../utils/closeableDialogTitle';

export function HostLobby({ isHostDialogOpen, setIsHostDialogOpen, setDisplayNameInput, displayNameInput, handleCreateLobby }: { isHostDialogOpen: boolean; setIsHostDialogOpen: Dispatch<SetStateAction<boolean>>; setDisplayNameInput: Dispatch<SetStateAction<string>>; displayNameInput: string; handleCreateLobby: () => Promise<void> }) {
  return <Dialog open={isHostDialogOpen} onClose={() => setIsHostDialogOpen(false)}>
    <CloseableDialogTitle onClose={() => setIsHostDialogOpen(false)}>Host Lobby</CloseableDialogTitle>
    <DialogContent>
      <TextField
        autoFocus
        fullWidth
        label="Player Name"
        margin="dense"
        onChange={(event) => setDisplayNameInput(event.target.value)}
        value={displayNameInput} />
    </DialogContent>
    <DialogActions>
      <Button onClick={() => setIsHostDialogOpen(false)}>Cancel</Button>
      <Button disabled={!displayNameInput.trim()} onClick={() => void handleCreateLobby()} variant="contained">Host</Button>
    </DialogActions>
  </Dialog>;
}

export function JoinLobby({ isJoinDialogOpen, setIsJoinDialogOpen, setDisplayNameInput, displayNameInput, setJoinCodeInput, joinCodeInput, handleJoinLobby }: { isJoinDialogOpen: boolean; setIsJoinDialogOpen: Dispatch<SetStateAction<boolean>>; setDisplayNameInput: Dispatch<SetStateAction<string>>; displayNameInput: string; setJoinCodeInput: Dispatch<SetStateAction<string>>; joinCodeInput: string; handleJoinLobby: () => Promise<void> }) {
  return <Dialog open={isJoinDialogOpen} onClose={() => setIsJoinDialogOpen(false)}>
    <CloseableDialogTitle onClose={() => setIsJoinDialogOpen(false)}>Join Lobby</CloseableDialogTitle>
    <DialogContent>
      <TextField
        autoFocus
        fullWidth
        label="Player Name"
        margin="dense"
        onChange={(event) => setDisplayNameInput(event.target.value)}
        value={displayNameInput} />
      <TextField
        fullWidth
        label="Lobby Code"
        margin="dense"
        onChange={(event) => setJoinCodeInput(event.target.value.toUpperCase())}
        value={joinCodeInput} />
    </DialogContent>
    <DialogActions>
      <Button onClick={() => setIsJoinDialogOpen(false)}>Cancel</Button>
      <Button disabled={!displayNameInput.trim() || !joinCodeInput.trim()} onClick={() => void handleJoinLobby()} variant="contained">Join</Button>
    </DialogActions>
  </Dialog>;
}
