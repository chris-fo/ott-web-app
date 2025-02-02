import React, { useCallback, useState } from 'react';

import styles from './TrailerModal.module.scss';

import type { PlaylistItem } from '#types/playlist';
import Modal from '#src/components/Modal/Modal';
import Player from '#src/components/Player/Player';
import ModalCloseButton from '#src/components/ModalCloseButton/ModalCloseButton';
import Fade from '#src/components/Animation/Fade/Fade';
import { useConfigStore } from '#src/stores/ConfigStore';

type Props = {
  item?: PlaylistItem | null;
  title: string;
  open: boolean;
  onClose: () => void;
};

const TrailerModal: React.FC<Props> = ({ item, open, title, onClose }) => {
  const { player } = useConfigStore((s) => s.config);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [userActive, setUserActive] = useState(true);

  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);
  const handleUserActive = useCallback(() => setUserActive(true), []);
  const handleUserInactive = useCallback(() => setUserActive(false), []);

  if (!item) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.container}>
        <Player
          item={item}
          playerId={player}
          onPlay={handlePlay}
          onPause={handlePause}
          onComplete={onClose}
          onUserActive={handleUserActive}
          onUserInActive={handleUserInactive}
        />
        <Fade open={!isPlaying || userActive}>
          <div className={styles.playerOverlay}>
            <div className={styles.title}>{title}</div>
          </div>
          <ModalCloseButton onClick={onClose} />
        </Fade>
      </div>
    </Modal>
  );
};

export default TrailerModal;
