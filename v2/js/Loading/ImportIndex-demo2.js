
export * from '../Main.js';
export * from '../Report.js';
export * from '../Controls.js';


export * from '../Util/THREE-Material.js';
export * from '../Util/Util.js';
export * from '../Util/IntervalSGTree.js';
export * from '../Util/HelperGeometry.js';
export * from '../Util/HeapHCF.js';
export * from '../Util/Heap.js';
export * from '../Util/CSMAdapter.js';
export * from '../Util/ObjectCache.js';
export * from '../Util/AggregateGeometry.js';


export * from '../Assets/Assets.js';
export * from '../Assets/AssetsLoader.js';
export * from '../Assets/ItemSpec.js';
export * from '../Assets/BranchSpec.js';
export * from '../Assets/BranchSpecData.js';
export * from '../Assets/BranchSpecDataSummary.js';
export * from '../Assets/LogSpec.js';
export * from '../Assets/TreeSpec.js';

export * from '../Assets/ItemSpecData.js';
export * from '../Assets/Lang.js';


export * from '../SpatialIndex/SpatialIndex.js';
export * from '../SpatialIndex/SpatialContainer.js';
export * from '../SpatialIndex/CGroup.js';


export * from '../Data/UserBase.js';
export * from '../Data/Local.js';
export * from '../Data/Area.js';
export * from '../Data/CameraLocation.js';
export * from '../Data/Progress.js';


export * from '../Item/Item.js';
export * from '../Item/Item-AreaDisplay.js';
export * from '../Item/CustomItem.js';

export * from '../Item/Unit.js';
export * from '../Item/Char.js';
export * from '../Item/Tree.js';
export * from '../Item/Rotor.js';
export * from '../Item/AxeCustom.js';
export * from '../Item/Container.js';


export * from '../ItemData/EventSource.js';
export * from '../ItemData/CharData.js';
export * from '../ItemData/ItemProps.js';

export * from '../ItemData/StoragePosition.js';
export * from '../ItemData/Storage.js';
export * from '../ItemData/Equipment.js';
export * from '../ItemData/Inventory.js';
export * from '../ItemData/LogStorage.js';
export * from '../ItemData/CustomData.js';
export * from '../ItemData/CustomFeature.js';
export * from '../ItemData/Slot.js';
export * from '../ItemData/SlotCollection.js';

export * from '../ItemData/Track.js';
export * from '../ItemData/TrackData.js';
export * from '../ItemData/TrackList.js';

export * from '../ItemData/Action.js';
export * from '../ItemData/ItemEvent.js';
export * from '../ItemData/ItemEventQueue.js';


export * from '../Path/AngularData.js';
export * from '../Path/AngularSegment.js';
export * from '../Path/AngularSweep.js';
export * from '../Path/AngularSweep-static.js';
export * from '../Path/AngularSweep-staticData.js';
export * from '../Path/AngularSweepLine.js';
export * from '../Path/ASData.js';
export * from '../Path/ASDynamic.js';
export * from '../Path/Destination.js';
export * from '../Path/DynamicExpansion.js';
export * from '../Path/DynamicPathLevel_A_Star.js';
export * from '../Path/Expansion.js';
export * from '../Path/Heuristic.js';
export * from '../Path/PathLevel_A_Star.js';
export * from '../Path/PathLevelData.js';
export * from '../Path/PathPlanner.js';
export * from '../Path/VGNode.js';
export * from '../Path/VGNodeId.js';
export * from '../Path/WayPoints.js';

export * from '../Path/TrackSolver/TrackBypass.js';
export * from '../Path/TrackSolver/TrackInterval.js';
export * from '../Path/TrackSolver/TrackQuarticSolver.js';
export * from '../Path/TrackSolver/TrackSolver.js';


export * from '../AI/ApproachPoint.js';
export * from '../AI/VisibilityCircle.js';
export * from '../AI/CirclePacking.js';
export * from '../AI/VCDebug.js';
export * from '../AI/VCFace.js';


export * from '../AI/AI.js';
export * from '../AI/EpisodeCollection.js';
export * from '../AI/TaskList.js';

export * from '../AI/Episodes/Episode.js';
export * from '../AI/Episodes/EpisodeIdle.js';
export * from '../AI/Episodes/EpisodeLeave.js';
export * from '../AI/Episodes/EpisodeMoveToPartial.js';
export * from '../AI/Episodes/EpisodeInPlaceAction.js';
export * from '../AI/Episodes/EpisodeWait.js';
export * from '../AI/Episodes/EpisodeAtPile.js';

export * from '../AI/Tasks/Task.js';
export * from '../AI/Tasks/TaskCollectLogs.js';
export * from '../AI/Tasks/TaskCutWood.js';
export * from '../AI/Tasks/TaskDeliverLog.js';
export * from '../AI/Tasks/TaskDropCarrying.js';
export * from '../AI/Tasks/TaskGrabItem.js';
export * from '../AI/Tasks/TaskIdle.js';
export * from '../AI/Tasks/TaskMoveTo.js';
export * from '../AI/Tasks/TaskThrowInventoryItem.js';
export * from '../AI/Tasks/TaskMoveToBaseCenter.js';
export * from '../AI/Tasks/TaskExchangeItemsBaseCenter.js';



function doImport() {

	var isNode = typeof window == "undefined";
	var haveExport5 = !isNode && typeof window.export5 == "function";

	for (let [ name, exported ] of Object.entries(this)) {

		if (name == "doImport")
			continue;

		if (isNode)
			global[name] = exported;
		else
			window[name] = exported;

		if (haveExport5)
			export5(name, exported);
	}
}


export { doImport };

