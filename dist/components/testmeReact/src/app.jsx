import React from "react";
import ReactDOM from "react-dom";
import { Store as testmeReactStore } from "./stores/testmeReactStore";
import testmeReactComponent from "./components/testmeReactComponent";

class TestmeReact extends React.Component {
	constructor(props) {
		super(props);

		this.state = {};
	}

	componentDidMount() {}
	componentDidUpdate(prevProps, prevState) {}
	componentWillUnmount() {}

	render() {
		return (
			<div>
				<testmeReactComponent />
			</div>
		);
	}
}
//for debugging.
window.testmeReactStore = testmeReactStore;

// render component when FSBL is ready.
const FSBLReady = () => {
	ReactDOM.render(
		<TestmeReact />,
		document.getElementById("testmeReact-component-wrapper")
	);
};

if (window.FSBL && FSBL.addEventListener) {
	FSBL.addEventListener("onReady", FSBLReady);
} else {
	window.addEventListener("FSBLReady", FSBLReady);
}
