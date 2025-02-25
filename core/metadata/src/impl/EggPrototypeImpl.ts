import { EggPrototype, InjectObjectProto } from '../model/EggPrototype';
import {
  AccessLevel,
  EggProtoImplClass,
  EggPrototypeName, MetaDataKey, MetadataUtil,
  ObjectInitTypeLike,
  QualifierInfo,
} from '@eggjs/core-decorator';
import { Id } from '@eggjs/tegg-lifecycle';


export class EggPrototypeImpl implements EggPrototype {
  private readonly clazz: EggProtoImplClass;
  private readonly qualifiers: QualifierInfo[];
  readonly filepath: string;

  readonly id: string;
  readonly name: EggPrototypeName;
  readonly initType: ObjectInitTypeLike;
  readonly accessLevel: AccessLevel;
  readonly injectObjects: InjectObjectProto[];
  readonly loadUnitId: Id;

  constructor(
    id: string,
    name: EggPrototypeName,
    clazz: EggProtoImplClass,
    filepath: string,
    initType: ObjectInitTypeLike,
    accessLevel: AccessLevel,
    injectObjectMap: InjectObjectProto[],
    loadUnitId: Id,
    qualifiers: QualifierInfo[],
  ) {
    this.id = id;
    this.clazz = clazz;
    this.name = name;
    this.filepath = filepath;
    this.initType = initType;
    this.accessLevel = accessLevel;
    this.injectObjects = injectObjectMap;
    this.loadUnitId = loadUnitId;
    this.qualifiers = qualifiers;
  }

  verifyQualifiers(qualifiers: QualifierInfo[]): boolean {
    for (const qualifier of qualifiers) {
      if (!this.verifyQualifier(qualifier)) {
        return false;
      }
    }
    return true;
  }

  verifyQualifier(qualifier: QualifierInfo): boolean {
    const selfQualifiers = this.qualifiers.find(t => t.attribute === qualifier.attribute);
    return selfQualifiers?.value === qualifier.value;
  }

  constructEggObject(): object {
    return Reflect.construct(this.clazz, []);
  }

  getMetaData<T>(metadataKey: MetaDataKey): T | undefined {
    return MetadataUtil.getMetaData(metadataKey, this.clazz);
  }
}
