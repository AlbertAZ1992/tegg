import mm from 'egg-mock';
import assert from 'assert';
import path from 'path';
import { EggControllerLoader } from '../../lib/EggControllerLoader';
import { ControllerMetadataUtil } from '@eggjs/tegg';

describe('test/lib/EggModuleLoader.test.ts', () => {
  beforeEach(() => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
  });

  afterEach(() => {
    mm.restore();
  });

  it('should work', () => {
    const baseDir = path.join(__dirname, '../fixtures/apps/controller-app');
    const loader = new EggControllerLoader(baseDir);
    const clazzs = loader.load();
    assert(clazzs.length === 6);
    const AppController = clazzs[0];
    const metadata = ControllerMetadataUtil.getControllerMetadata(AppController);
    assert(metadata);
  });
});
