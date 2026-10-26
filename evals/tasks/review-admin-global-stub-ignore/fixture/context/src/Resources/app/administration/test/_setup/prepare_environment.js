import { config } from '@vue/test-utils';
import SwCard from 'src/app/component/base/sw-card';

config.global.mocks = {
    $tc: (key) => key,
    $te: () => true,
    $device: { onResize: () => {} },
};

config.global.components = {
    'sw-card': SwCard,
};

config.global.stubs = {
    'sw-icon': true,
    'sw-block': true,
    'sw-button': true,
    'sw-field': true,
};
