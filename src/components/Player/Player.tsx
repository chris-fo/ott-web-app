import React, { useCallback, useEffect, useRef, useState } from 'react';

import styles from './Player.module.scss';

import { addScript } from '#src/utils/dom';
import { deepCopy } from '#src/utils/collection';
import type { JWPlayer } from '#types/jwplayer';
import type { PlaylistItem } from '#types/playlist';
import useEventCallback from '#src/hooks/useEventCallback';
import useOttAnalytics from '#src/hooks/useOttAnalytics';
import { logDev } from '#src/utils/common';

type Props = {
  playerId: string;
  feedId?: string;
  item: PlaylistItem;
  onReady?: (player?: JWPlayer) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onComplete?: () => void;
  onUserActive?: () => void;
  onUserInActive?: () => void;
  onBeforePlay?: () => void;
  onFirstFrame?: () => void;
  onPlaylistItemCallback?: (item: PlaylistItem) => Promise<undefined | PlaylistItem>;
  startTime?: number;
};

const Player: React.FC<Props> = ({
  playerId,
  item,
  onReady,
  onPlay,
  onPause,
  onComplete,
  onUserActive,
  onUserInActive,
  onBeforePlay,
  onFirstFrame,
  onPlaylistItemCallback,
  feedId,
  startTime = 0,
}: Props) => {
  const playerElementRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<JWPlayer>();
  const loadingRef = useRef(false);
  const [libLoaded, setLibLoaded] = useState(!!window.jwplayer);
  const startTimeRef = useRef(startTime);
  const scriptUrl = `${import.meta.env.APP_API_BASE_URL}/libraries/${playerId}.js`;
  const setPlayer = useOttAnalytics(item, feedId);

  const handleBeforePlay = useEventCallback(onBeforePlay);
  const handlePlay = useEventCallback(onPlay);
  const handlePause = useEventCallback(onPause);
  const handleComplete = useEventCallback(onComplete);
  const handleUserActive = useEventCallback(onUserActive);
  const handleUserInactive = useEventCallback(onUserInActive);
  const handleFirstFrame = useEventCallback(onFirstFrame);
  const handlePlaylistItemCallback = useEventCallback(onPlaylistItemCallback);
  const handleReady = useEventCallback(() => onReady && onReady(playerRef.current));

  const attachEvents = useCallback(() => {
    playerRef.current?.on('ready', handleReady);
    playerRef.current?.on('beforePlay', handleBeforePlay);
    playerRef.current?.on('complete', handleComplete);
    playerRef.current?.on('play', handlePlay);
    playerRef.current?.on('pause', handlePause);
    playerRef.current?.on('userActive', handleUserActive);
    playerRef.current?.on('userInactive', handleUserInactive);
    playerRef.current?.on('firstFrame', handleFirstFrame);
    playerRef.current?.setPlaylistItemCallback(handlePlaylistItemCallback);
  }, [
    handleReady,
    handleBeforePlay,
    handleComplete,
    handlePlay,
    handlePause,
    handleUserActive,
    handleUserInactive,
    handleFirstFrame,
    handlePlaylistItemCallback,
  ]);

  const detachEvents = useCallback(() => {
    playerRef.current?.off('ready');
    playerRef.current?.off('beforePlay');
    playerRef.current?.off('complete');
    playerRef.current?.off('play');
    playerRef.current?.off('pause');
    playerRef.current?.off('userActive');
    playerRef.current?.off('userInactive');
    playerRef.current?.off('firstFrame');
  }, []);

  useEffect(() => {
    if (!window.jwplayer && !loadingRef.current) {
      loadingRef.current = true;

      addScript(scriptUrl).then(() => {
        setLibLoaded(true);
        loadingRef.current = false;
      });
    }
  }, [scriptUrl]);

  useEffect(() => {
    if (!playerId) {
      return;
    }

    const loadPlaylist = () => {
      if (!item || !playerRef.current) {
        return;
      }

      const currentItem = playerRef.current?.getPlaylistItem() as PlaylistItem | null;

      // we already loaded this item
      if (currentItem && currentItem.mediaid === item.mediaid) {
        logDev('Calling loadPlaylist with the same item, check the dependencies');
        return;
      }
      // load new item
      playerRef.current.load([deepCopy({ ...item, starttime: startTimeRef.current })]);
    };

    const initializePlayer = () => {
      if (!window.jwplayer || !playerElementRef.current) return;

      playerRef.current = window.jwplayer(playerElementRef.current) as JWPlayer;

      playerRef.current.setup({
        aspectratio: false,
        playlist: [deepCopy({ ...item, starttime: startTimeRef.current })],
        width: '100%',
        height: '100%',
        mute: false,
        autostart: true,
        repeat: false,
      });

      setPlayer(playerRef.current);
      attachEvents();
    };

    if (playerRef.current) {
      return loadPlaylist();
    }

    if (libLoaded) {
      initializePlayer();
    }
  }, [libLoaded, item, detachEvents, attachEvents, playerId, setPlayer]);

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        // Detaching events before component unmount
        detachEvents();
        playerRef.current.remove();
      }
    };
  }, [detachEvents]);

  return (
    <div className={styles.container} data-testid="player-container">
      <div ref={playerElementRef} />
    </div>
  );
};

export default Player;
