import { DB } from '../../../generated/indexer'
import { Language } from '../../../generated/graphql-server/src/modules/language/language.model'
import {
  ClassEntityMap,
  IChannel,
  ICreateEntityOperation,
  IEntity,
  IFeaturedVideo,
  ILicense,
  IMediaLocation,
  IVideo,
  IVideoMedia,
} from '../../types'
import { getClassName } from './create'
import {
  channelPropertyNamesWithId,
  ContentDirectoryKnownClasses,
  featuredVideoPropertyNamesWithId,
  licensePropertyNamesWithId,
  mediaLocationPropertyNamesWithId,
  videoMediaPropertyNamesWithId,
  videoPropertyNamesWithId,
} from '../content-dir-consts'
import { decode } from '../decode'
import { VideoMediaEncoding } from '../../../generated/graphql-server/src/modules/video-media-encoding/video-media-encoding.model'
import { MediaLocationEntity } from '../../../generated/graphql-server/src/modules/media-location-entity/media-location-entity.model'
import { Category } from '../../../generated/graphql-server/src/modules/category/category.model'
import { Channel } from '../../../generated/graphql-server/src/modules/channel/channel.model'
import { LicenseEntity } from '../../../generated/graphql-server/src/modules/license-entity/license-entity.model'
import { VideoMedia } from '../../../generated/graphql-server/src/modules/video-media/video-media.model'
import { UserDefinedLicenseEntity } from '../../../generated/graphql-server/src/modules/user-defined-license-entity/user-defined-license-entity.model'
import { KnownLicenseEntity } from '../../../generated/graphql-server/src/modules/known-license-entity/known-license-entity.model'
import { JoystreamMediaLocationEntity } from '../../../generated/graphql-server/src/modules/joystream-media-location-entity/joystream-media-location-entity.model'
import { HttpMediaLocationEntity } from '../../../generated/graphql-server/src/modules/http-media-location-entity/http-media-location-entity.model'
import { Video } from '../../../generated/graphql-server/src/modules/video/video.model'

function getEntity(classEntityMap: ClassEntityMap, className: string, entityId: number) {
  const newlyCreatedEntities = classEntityMap.get(className)
  if (!newlyCreatedEntities) return true
  return !newlyCreatedEntities.find((e) => e.indexOf === entityId)
}

async function transaction(
  db: DB,
  createEntityOperations: ICreateEntityOperation[],
  entities: IEntity[]
): Promise<boolean> {
  const classEntityMap: ClassEntityMap = new Map<string, IEntity[]>()

  for (const entity of entities) {
    const className = await getClassName(db, entity, createEntityOperations)
    if (className !== undefined) {
      const es = classEntityMap.get(className)
      classEntityMap.set(className, es ? [...es, entity] : [entity])
    }
  }

  let ignoreOperations = false

  for (const [className, entities] of classEntityMap) {
    for (const entity of entities) {
      const { properties } = entity

      switch (className) {
        case ContentDirectoryKnownClasses.CHANNEL: {
          const props = decode.setEntityPropertyValues<IChannel>(properties, channelPropertyNamesWithId)
          const { language } = props
          if (language) {
            ignoreOperations = language.existing
              ? !(await db.get(Language, { where: { id: language.entityId.toString() } }))
              : getEntity(classEntityMap, 'Language', language.entityId)
            if (ignoreOperations) return ignoreOperations
          }
          break
        }

        case ContentDirectoryKnownClasses.VIDEOMEDIA: {
          const props = decode.setEntityPropertyValues<IVideoMedia>(properties, videoMediaPropertyNamesWithId)
          const { encoding, location } = props

          if (encoding) {
            ignoreOperations = encoding.existing
              ? !(await db.get(VideoMediaEncoding, { where: { id: encoding.entityId.toString() } }))
              : getEntity(classEntityMap, 'VideoMediaEncoding', encoding.entityId)
            if (ignoreOperations) return ignoreOperations
          }

          if (location) {
            ignoreOperations = location.existing
              ? !(await db.get(MediaLocationEntity, { where: { id: location.entityId.toString() } }))
              : getEntity(classEntityMap, `MediaLocation`, location.entityId)
            if (ignoreOperations) return ignoreOperations
          }
          break
        }

        case ContentDirectoryKnownClasses.VIDEO: {
          const props = decode.setEntityPropertyValues<IVideo>(properties, videoPropertyNamesWithId)
          const { category, channel, language, license, media } = props
          if (category) {
            ignoreOperations = category.existing
              ? !(await db.get(Category, { where: { id: category.entityId.toString() } }))
              : getEntity(classEntityMap, `Category`, category.entityId)
            if (ignoreOperations) return ignoreOperations
          }
          if (channel) {
            ignoreOperations = channel.existing
              ? !(await db.get(Channel, { where: { id: channel.entityId.toString() } }))
              : getEntity(classEntityMap, `Channel`, channel.entityId)
            if (ignoreOperations) return ignoreOperations
          }
          if (language) {
            ignoreOperations = language.existing
              ? !(await db.get(Language, { where: { id: language.entityId.toString() } }))
              : getEntity(classEntityMap, `Language`, language.entityId)
            if (ignoreOperations) return ignoreOperations
          }
          if (license) {
            ignoreOperations = license.existing
              ? !(await db.get(LicenseEntity, { where: { id: license.entityId.toString() } }))
              : getEntity(classEntityMap, `License`, license.entityId)
            if (ignoreOperations) return ignoreOperations
          }
          if (media) {
            ignoreOperations = media.existing
              ? !(await db.get(VideoMedia, { where: { id: media.entityId.toString() } }))
              : getEntity(classEntityMap, `VideoMedia`, media.entityId)
            if (ignoreOperations) return ignoreOperations
          }
          break
        }

        case ContentDirectoryKnownClasses.LICENSE: {
          const props = decode.setEntityPropertyValues<ILicense>(properties, licensePropertyNamesWithId)
          const { knownLicense, userDefinedLicense } = props
          if (knownLicense) {
            ignoreOperations = knownLicense.existing
              ? !(await db.get(KnownLicenseEntity, { where: { id: knownLicense.entityId.toString() } }))
              : getEntity(classEntityMap, `KnownLicense`, knownLicense.entityId)
            if (ignoreOperations) return ignoreOperations
          }

          if (userDefinedLicense) {
            ignoreOperations = userDefinedLicense.existing
              ? !(await db.get(UserDefinedLicenseEntity, { where: { id: userDefinedLicense.entityId.toString() } }))
              : getEntity(classEntityMap, `UserDefinedLicense`, userDefinedLicense.entityId)
            if (ignoreOperations) return ignoreOperations
          }

          break
        }
        case ContentDirectoryKnownClasses.MEDIALOCATION: {
          const props = decode.setEntityPropertyValues<IMediaLocation>(properties, mediaLocationPropertyNamesWithId)
          const { joystreamMediaLocation, httpMediaLocation } = props

          if (joystreamMediaLocation) {
            ignoreOperations = joystreamMediaLocation.existing
              ? !(await db.get(JoystreamMediaLocationEntity, {
                  where: { id: joystreamMediaLocation.entityId.toString() },
                }))
              : getEntity(classEntityMap, `JoystreamMediaLocation`, joystreamMediaLocation.entityId)
            if (ignoreOperations) return ignoreOperations
          }
          if (httpMediaLocation) {
            ignoreOperations = httpMediaLocation.existing
              ? !(await db.get(HttpMediaLocationEntity, { where: { id: httpMediaLocation.entityId.toString() } }))
              : getEntity(classEntityMap, `HttpMediaLocation`, httpMediaLocation.entityId)
            if (ignoreOperations) return ignoreOperations
          }
          break
        }

        case ContentDirectoryKnownClasses.FEATUREDVIDEOS: {
          const props = decode.setEntityPropertyValues<IFeaturedVideo>(properties, featuredVideoPropertyNamesWithId)
          const { video } = props
          if (video) {
            ignoreOperations = video.existing
              ? !(await db.get(Video, { where: { id: video.entityId.toString } }))
              : getEntity(classEntityMap, `Video`, video.entityId)
            if (ignoreOperations) return ignoreOperations
          }
          break
        }

        default:
          break
      }
    }
  }
  return ignoreOperations
}

async function channel(props: IChannel, db: DB): Promise<boolean> {
  if (props.language) {
    return !(await db.get(Language, { where: { id: props.language.entityId.toString() } }))
  }
  return false
}

async function videoMedia(props: IVideoMedia, db: DB): Promise<boolean> {
  const { encoding, location } = props
  if (encoding && !(await db.get(VideoMediaEncoding, { where: { id: encoding.entityId.toString() } }))) {
    return true
  }
  if (location && !(await db.get(MediaLocationEntity, { where: { id: location.entityId.toString() } }))) {
    return true
  }
  return false
}

async function video(props: IVideo, db: DB): Promise<boolean> {
  const { category, channel, language, license, media } = props
  console.log(`Before ignore`, props)

  if (category && !(await db.get(Category, { where: { id: category.entityId.toString() } }))) {
    return true
  }
  if (channel && !(await db.get(Channel, { where: { id: channel.entityId.toString() } }))) {
    return true
  }
  if (language && !(await db.get(Language, { where: { id: language.entityId.toString() } }))) {
    return true
  }
  if (license && !(await db.get(LicenseEntity, { where: { id: license.entityId.toString() } }))) {
    return true
  }
  if (media && !(await db.get(VideoMedia, { where: { id: media.entityId.toString() } }))) {
    return true
  }
  return false
}

async function mediaLocation(props: IMediaLocation, db: DB): Promise<boolean> {
  const { joystreamMediaLocation, httpMediaLocation } = props
  if (
    joystreamMediaLocation &&
    !(await db.get(JoystreamMediaLocationEntity, {
      where: { id: joystreamMediaLocation.entityId.toString() },
    }))
  ) {
    return true
  }
  if (
    httpMediaLocation &&
    !(await db.get(HttpMediaLocationEntity, { where: { id: httpMediaLocation.entityId.toString() } }))
  ) {
    return true
  }
  return false
}

async function license(props: ILicense, db: DB): Promise<boolean> {
  const { knownLicense, userDefinedLicense } = props

  if (knownLicense && !(await db.get(KnownLicenseEntity, { where: { id: knownLicense.entityId.toString() } }))) {
    return true
  }
  if (
    userDefinedLicense &&
    !(await db.get(UserDefinedLicenseEntity, {
      where: { id: userDefinedLicense.entityId.toString() },
    }))
  ) {
    return true
  }
  return false
}

async function featuredVideo(props: IFeaturedVideo, db: DB): Promise<boolean> {
  if (props.video) {
    return !(await db.get(Video, { where: { id: props.video.entityId.toString() } }))
  }
  return false
}

export const shouldIgnore = {
  transaction,
  channel,
  videoMedia,
  video,
  mediaLocation,
  license,
  featuredVideo,
}
