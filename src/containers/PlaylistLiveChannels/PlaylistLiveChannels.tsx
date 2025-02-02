import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import shallow from 'zustand/shallow';
import { useHistory, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { differenceInSeconds, format } from 'date-fns';

import styles from './PlaylistLiveChannels.module.scss';

import Epg from '#src/components/Epg/Epg';
import useBlurImageUpdater from '#src/hooks/useBlurImageUpdater';
import { useConfigStore } from '#src/stores/ConfigStore';
import type { Playlist } from '#types/playlist';
import VideoDetails from '#src/components/VideoDetails/VideoDetails';
import LoadingOverlay from '#src/components/LoadingOverlay/LoadingOverlay';
import useLiveChannels from '#src/hooks/useLiveChannels';
import ShareButton from '#src/components/ShareButton/ShareButton';
import StartWatchingButton from '#src/containers/StartWatchingButton/StartWatchingButton';
import Cinema from '#src/containers/Cinema/Cinema';
import useEntitlement from '#src/hooks/useEntitlement';
import { addQueryParams, formatDurationTag, liveChannelsURL } from '#src/utils/formatting';
import Button from '#src/components/Button/Button';
import Play from '#src/icons/Play';
import useLiveProgram from '#src/hooks/useLiveProgram';
import Tag from '#src/components/Tag/Tag';
import useBreakpoint, { Breakpoint } from '#src/hooks/useBreakpoint';
import { generateMovieJSONLD } from '#src/utils/structuredData';

function PlaylistLiveChannels({ playlist: { feedid, playlist } }: { playlist: Playlist }) {
  const { t } = useTranslation('epg');
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === Breakpoint.xs;

  // Config
  const { config } = useConfigStore(({ config }) => ({ config }), shallow);
  const { siteName, styling, features } = config;

  const posterFading: boolean = styling?.posterFading === true;
  const enableSharing: boolean = features?.enableSharing === true;

  const updateBlurImage = useBlurImageUpdater(playlist);

  // Routing
  const location = useLocation();
  const history = useHistory();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const play = searchParams.get('play') === '1';
  const channelId = searchParams.get('channel') ?? undefined;
  const liveStartDateTime = searchParams.get('start');
  const liveEndDateTime = searchParams.get('end');
  const liveFromBeginning = searchParams.get('beginning') === '1';
  const goBack = () => feedid && history.push(liveChannelsURL(feedid, channelId));

  // EPG data
  const [initialChannelId] = useState(channelId);
  const { channels, channel, program, setActiveChannel } = useLiveChannels(playlist, initialChannelId, !liveFromBeginning);
  const { isLive, isVod, isWatchableFromBeginning } = useLiveProgram(program, channel?.catchupHours);

  // Media item
  const channelMediaItem = useMemo(() => playlist.find(({ mediaid }) => channel?.id === mediaid), [channel?.id, playlist]);
  const { isEntitled } = useEntitlement(channelMediaItem);

  const videoDetails = useMemo(() => {
    if (program) {
      return {
        title: program.title,
        description: program.description || '',
        poster: program.image,
        canWatch: isLive || (isVod && isWatchableFromBeginning),
        canWatchFromBeginning: isEntitled && isLive && isWatchableFromBeginning,
      };
    }

    return {
      title: channel?.title || '',
      description: channel?.description || '',
      poster: channel?.image,
      canWatch: true,
      canWatchFromBeginning: false,
    };
  }, [channel, isEntitled, isLive, isVod, isWatchableFromBeginning, program]);

  const primaryMetadata = useMemo(() => {
    if (!channel) {
      return '';
    }

    if (!program) {
      return <Tag isLive>{t('common:live')}</Tag>;
    }

    const startTime = new Date(program.startTime);
    const endTime = new Date(program.endTime);
    const durationInSeconds = differenceInSeconds(endTime, startTime);
    const duration = formatDurationTag(durationInSeconds);

    return (
      <>
        <Tag className={styles.tag} isLive={isLive}>
          {isLive ? t('common:live') : `${format(startTime, 'p')} - ${format(endTime, 'p')}`}
        </Tag>
        {t('on_channel', { name: channel.title })}
        {' • '}
        {duration}
      </>
    );
  }, [channel, isLive, program, t]);

  // Handlers
  const handleProgramClick = (programId: string, channelId: string) => {
    setActiveChannel(channelId, programId);

    // scroll to top when clicking a program
    (document.scrollingElement || document.body).scroll({ top: 0, behavior: 'smooth' });
  };

  const handleChannelClick = (channelId: string) => {
    setActiveChannel(channelId);
  };

  // Effects
  useEffect(() => {
    const toImage = program?.image || channelMediaItem?.image;
    if (toImage) updateBlurImage(toImage);
  }, [channelMediaItem?.image, program, updateBlurImage]);

  useEffect(() => {
    // update the channel id in URL
    if (channel && feedid) history.replace(liveChannelsURL(feedid, channel.id));
  }, [history, feedid, channel]);

  // Loading (channel and feedid must be defined)
  if (!channel || !feedid) {
    return <LoadingOverlay />;
  }

  // SEO (for channels)
  const canonicalUrl = `${window.location.origin}${liveChannelsURL(feedid, channel.id)}`;
  const pageTitle = `${channel.title} - ${siteName}`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <link rel="canonical" href={canonicalUrl} />
        <meta name="description" content={channelMediaItem?.description} />
        <meta property="og:description" content={channelMediaItem?.description} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:type" content="video.other" />
        {channelMediaItem?.image && <meta property="og:image" content={channelMediaItem.image?.replace(/^https:/, 'http:')} />}
        {channelMediaItem?.image && <meta property="og:image:secure_url" content={channelMediaItem.image?.replace(/^http:/, 'https:')} />}
        <meta property="og:image:width" content={channelMediaItem?.image ? '720' : ''} />
        <meta property="og:image:height" content={channelMediaItem?.image ? '406' : ''} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={channelMediaItem?.description} />
        <meta name="twitter:image" content={channelMediaItem?.image} />
        <meta property="og:video" content={canonicalUrl.replace(/^https:/, 'http:')} />
        <meta property="og:video:secure_url" content={canonicalUrl.replace(/^http:/, 'https:')} />
        <meta property="og:video:type" content="text/html" />
        <meta property="og:video:width" content="1280" />
        <meta property="og:video:height" content="720" />
        {channelMediaItem?.tags?.split(',').map((tag) => (
          <meta property="og:video:tag" content={tag} key={tag} />
        ))}
        {channelMediaItem ? <script type="application/ld+json">{generateMovieJSONLD(channelMediaItem)}</script> : null}
      </Helmet>
      {channelMediaItem && (
        <Cinema
          open={play && isEntitled}
          onClose={goBack}
          item={channelMediaItem}
          title={videoDetails.title}
          primaryMetadata={primaryMetadata}
          feedId={feedid}
          liveStartDateTime={liveStartDateTime}
          liveEndDateTime={liveEndDateTime}
          liveFromBeginning={liveFromBeginning}
        />
      )}
      <VideoDetails
        title={videoDetails.title}
        description={videoDetails.description}
        primaryMetadata={primaryMetadata}
        posterMode={posterFading ? 'fading' : 'normal'}
        poster={videoDetails.poster}
        childrenPadding={!isMobile}
        startWatchingButton={
          channelMediaItem ? (
            <>
              <StartWatchingButton
                item={channelMediaItem}
                playUrl={addQueryParams(liveChannelsURL(feedid, channelId, true), {
                  start: isVod ? program?.startTime : undefined,
                  end: isVod ? program?.endTime : undefined,
                })}
                disabled={!videoDetails.canWatch}
              />
              {videoDetails.canWatchFromBeginning && (
                <Button
                  className={styles.catchupButton}
                  onClick={() =>
                    history.push(
                      addQueryParams(liveChannelsURL(feedid || '', channelId, true), {
                        start: program?.startTime,
                        beginning: 1,
                      }),
                    )
                  }
                  label={t('start_from_beginning')}
                  startIcon={<Play />}
                />
              )}
            </>
          ) : null
        }
        shareButton={
          enableSharing && channelMediaItem ? (
            <ShareButton title={channelMediaItem.title} description={channelMediaItem.description} url={window.location.href} />
          ) : null
        }
        trailerButton={null}
        favoriteButton={null}
      >
        <Epg channels={channels} onChannelClick={handleChannelClick} onProgramClick={handleProgramClick} channel={channel} program={program} config={config} />
      </VideoDetails>
    </>
  );
}

export default PlaylistLiveChannels;
