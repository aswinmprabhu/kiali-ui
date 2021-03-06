import * as React from 'react';
import { Button, ListView, ListViewIcon, ListViewItem } from 'patternfly-react';
import Slider from './Slider/Slider';
import { WorkloadOverview } from '../../types/ServiceInfo';
import { style } from 'typestyle';
import { PfColors } from '../Pf/PfColors';

type Props = {
  serviceName: string;
  workloads: WorkloadOverview[];
  onChange: (valid: boolean, workloads: WorkloadWeight[], reset: boolean) => void;
};

export type WorkloadWeight = {
  name: string;
  weight: number;
  locked: boolean;
  maxWeight: number;
};

const wkIconType = 'pf';
const wkIconName = 'bundle';

type State = {
  workloads: WorkloadWeight[];
};

const validationStyle = style({
  marginBottom: 10,
  color: PfColors.Red100,
  textAlign: 'right'
});

const resetStyle = style({
  marginBottom: 20
});

class WeightedRouting extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      workloads: []
    };
  }

  componentDidMount() {
    this.resetState();
  }

  resetState = () => {
    if (this.props.workloads.length === 0) {
      return;
    }
    const wkTraffic = this.props.workloads.length < 100 ? Math.round(100 / this.props.workloads.length) : 0;
    const remainTraffic = this.props.workloads.length < 100 ? 100 % this.props.workloads.length : 0;
    const workloads: WorkloadWeight[] = this.props.workloads.map(workload => ({
      name: workload.name,
      weight: wkTraffic,
      locked: false,
      maxWeight: 100
    }));
    if (remainTraffic > 0) {
      workloads[workloads.length - 1].weight = workloads[workloads.length - 1].weight + remainTraffic;
    }
    this.setState(
      {
        workloads: workloads
      },
      () => this.props.onChange(this.checkTotalWeight(), this.state.workloads, true)
    );
  };

  onWeight = (workloadName: string, newWeight: number) => {
    this.setState(
      prevState => {
        const nodeId: number[] = [];
        let maxWeight = 100;

        // Calculate maxWeight from locked nodes
        for (let i = 0; i < prevState.workloads.length; i++) {
          if (prevState.workloads[i].locked) {
            maxWeight -= prevState.workloads[i].weight;
          }
        }

        // Set new weight; remember rest of the nodes
        for (let i = 0; i < prevState.workloads.length; i++) {
          if (prevState.workloads[i].name === workloadName) {
            prevState.workloads[i].weight = newWeight;
            maxWeight -= newWeight;
          } else if (!prevState.workloads[i].locked) {
            // Only adjust those nodes that are not locked
            nodeId.push(i);
          }
        }

        // Distribute pending weights
        let sumWeights = 0;
        for (let j = 0; j < nodeId.length; j++) {
          if (sumWeights + prevState.workloads[nodeId[j]].weight > maxWeight) {
            prevState.workloads[nodeId[j]].weight = maxWeight - sumWeights;
          }
          sumWeights += prevState.workloads[nodeId[j]].weight;
        }

        // Adjust last element
        if (nodeId.length > 0 && sumWeights < maxWeight) {
          prevState.workloads[nodeId[nodeId.length - 1]].weight += maxWeight - sumWeights;
        }

        return {
          workloads: prevState.workloads
        };
      },
      () => this.props.onChange(this.checkTotalWeight(), this.state.workloads, false)
    );
  };

  onLock = (workloadName: string, locked: boolean) => {
    this.setState(prevState => {
      let maxWeights = 100;
      let numLocks = 0;
      for (let i = 0; i < prevState.workloads.length; i++) {
        if (prevState.workloads[i].name === workloadName) {
          prevState.workloads[i].locked = locked;
        }
        // Calculate maxWeights from locked nodes
        if (prevState.workloads[i].locked) {
          numLocks++;
          maxWeights -= prevState.workloads[i].weight;
        }
      }
      // Update non locked nodes maxWeight
      for (let i = 0; i < prevState.workloads.length; i++) {
        if (!prevState.workloads[i].locked) {
          prevState.workloads[i].maxWeight = maxWeights;
        }
      }
      return {
        workloads: prevState.workloads
      };
    });
  };

  checkTotalWeight = (): boolean => {
    // Check all weights are equal to 100
    return this.state.workloads.map(w => w.weight).reduce((a, b) => a + b, 0) === 100;
  };

  render() {
    const isValid = this.checkTotalWeight();
    return (
      <>
        <ListView>
          {this.state.workloads.map((workload, id) => {
            return (
              <ListViewItem
                key={'workload-' + id}
                leftContent={<ListViewIcon type={wkIconType} name={wkIconName} />}
                heading={workload.name}
                description={
                  <Slider
                    id={'slider-' + workload.name}
                    key={'slider-' + workload.name}
                    tooltip={true}
                    input={true}
                    inputFormat="%"
                    label={'Traffic Weight'}
                    value={workload.weight}
                    min={0}
                    max={workload.maxWeight}
                    onSlide={value => {
                      this.onWeight(workload.name, value as number);
                    }}
                    locked={this.state.workloads.length > 1 ? workload.locked : true}
                    showLock={this.state.workloads.length > 2}
                    onLock={locked => this.onLock(workload.name, locked)}
                  />
                }
              />
            );
          })}
        </ListView>
        {this.props.workloads.length > 1 && (
          <Button className={resetStyle} onClick={() => this.resetState()}>
            Evenly distribute traffic
          </Button>
        )}
        {!isValid && <div className={validationStyle}>The sum of all weights must be 100 %</div>}
      </>
    );
  }
}

export default WeightedRouting;
