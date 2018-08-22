import { GraphType } from './GraphType';

export class ColaGraph implements GraphType {
  static getLayout() {
    return {
      name: 'cola',
      animate: false,
      flow: { axis: 'x' },
      nodeDimensionsIncludeLabels: true
    };
  }
}
