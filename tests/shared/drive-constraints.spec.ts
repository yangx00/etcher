/*
 * Copyright 2017 balena.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { expect } from 'chai';
import { Drive as DrivelistDrive } from 'drivelist';
import * as _ from 'lodash';
import * as path from 'path';

import * as constraints from '../../lib/shared/drive-constraints';
import * as messages from '../../lib/shared/messages';

describe('Shared: DriveConstraints', function () {
	describe('.isDriveLocked()', function () {
		it('should return true if the drive is read-only', function () {
			const result = constraints.isDriveLocked({
				device: '/dev/disk2',
				size: 999999999,
				isReadOnly: true,
			} as DrivelistDrive);

			expect(result).to.be.true;
		});

		it('should return false if the drive is not read-only', function () {
			const result = constraints.isDriveLocked({
				device: '/dev/disk2',
				size: 999999999,
				isReadOnly: false,
			} as DrivelistDrive);

			expect(result).to.be.false;
		});

		it("should return false if we don't know if the drive is read-only", function () {
			const result = constraints.isDriveLocked({
				device: '/dev/disk2',
				size: 999999999,
			} as DrivelistDrive);

			expect(result).to.be.false;
		});

		it('should return false if the drive is undefined', function () {
			// @ts-ignore
			const result = constraints.isDriveLocked(undefined);
			expect(result).to.be.false;
		});
	});

	describe('.isSystemDrive()', function () {
		it('should return true if the drive is a system drive', function () {
			const result = constraints.isSystemDrive({
				device: '/dev/disk2',
				size: 999999999,
				isReadOnly: true,
				isSystem: true,
			} as DrivelistDrive);

			expect(result).to.be.true;
		});

		it('should default to `false` if the `system` property is `undefined`', function () {
			const result = constraints.isSystemDrive({
				device: '/dev/disk2',
				size: 999999999,
				isReadOnly: true,
			} as DrivelistDrive);

			expect(result).to.be.false;
		});

		it('should return false if the drive is a removable drive', function () {
			const result = constraints.isSystemDrive({
				device: '/dev/disk2',
				size: 999999999,
				isReadOnly: true,
				isSystem: false,
			} as DrivelistDrive);

			expect(result).to.be.false;
		});

		it('should return false if the drive is undefined', function () {
			// @ts-ignore
			const result = constraints.isSystemDrive(undefined);
			expect(result).to.be.false;
		});
	});

	describe('.isSourceDrive()', function () {
		it('should return false if no image', function () {
			const result = constraints.isSourceDrive(
				{
					device: '/dev/disk2',
					size: 999999999,
					isReadOnly: true,
					isSystem: false,
				} as DrivelistDrive,
				// @ts-ignore
				undefined,
			);

			expect(result).to.be.false;
		});

		it('should return false if there are no mount points', function () {
			const result = constraints.isSourceDrive(
				{
					device: '/dev/disk2',
					size: 999999999,
					isReadOnly: true,
					isSystem: false,
				} as DrivelistDrive,
				{
					path: '/Volumes/Untitled/image.img',
				},
			);

			expect(result).to.be.false;
		});

		describe('given Windows paths', function () {
			beforeEach(function () {
				this.separator = path.sep;
				// @ts-ignore
				path.sep = '\\';
			});

			afterEach(function () {
				// @ts-ignore
				path.sep = this.separator;
			});

			it('should return true if the image lives directly inside a mount point of the drive', function () {
				const result = constraints.isSourceDrive(
					{
						mountpoints: [
							{
								label: 'label',
								path: 'E:',
							},
							{
								label: 'label',
								path: 'F:',
							},
						],
					} as DrivelistDrive,
					{
						path: 'E:\\image.img',
					},
				);

				expect(result).to.be.true;
			});

			it('should return true if the image lives inside a mount point of the drive', function () {
				const result = constraints.isSourceDrive(
					{
						mountpoints: [
							{
								label: 'label',
								path: 'E:',
							},
							{
								label: 'label',
								path: 'F:',
							},
						],
					} as DrivelistDrive,
					{
						path: 'E:\\foo\\bar\\image.img',
					},
				);

				expect(result).to.be.true;
			});

			it('should return false if the image does not live inside a mount point of the drive', function () {
				const result = constraints.isSourceDrive(
					{
						mountpoints: [
							{
								label: 'label',
								path: 'E:',
							},
							{
								label: 'label',
								path: 'F:',
							},
						],
					} as DrivelistDrive,
					{
						path: 'G:\\image.img',
					},
				);

				expect(result).to.be.false;
			});

			it('should return false if the image is in a mount point that is a substring of the image mount point', function () {
				const result = constraints.isSourceDrive(
					{
						mountpoints: [
							{
								label: 'label',
								path: 'E:\\fo',
							},
						],
					} as DrivelistDrive,
					{
						path: 'E:\\foo/image.img',
					},
				);

				expect(result).to.be.false;
			});
		});

		describe('given UNIX paths', function () {
			beforeEach(function () {
				this.separator = path.sep;
				// @ts-ignore
				path.sep = '/';
			});

			afterEach(function () {
				// @ts-ignore
				path.sep = this.separator;
			});

			it('should return true if the mount point is / and the image lives directly inside it', function () {
				const result = constraints.isSourceDrive(
					{
						mountpoints: [
							{
								path: '/',
							},
						],
					} as DrivelistDrive,
					{
						path: '/image.img',
					},
				);

				expect(result).to.be.true;
			});

			it('should return true if the image lives directly inside a mount point of the drive', function () {
				const result = constraints.isSourceDrive(
					{
						mountpoints: [
							{
								path: '/Volumes/A',
							},
							{
								path: '/Volumes/B',
							},
						],
					} as DrivelistDrive,
					{
						path: '/Volumes/A/image.img',
					},
				);

				expect(result).to.be.true;
			});

			it('should return true if the image lives inside a mount point of the drive', function () {
				const result = constraints.isSourceDrive(
					{
						mountpoints: [
							{
								path: '/Volumes/A',
							},
							{
								path: '/Volumes/B',
							},
						],
					} as DrivelistDrive,
					{
						path: '/Volumes/A/foo/bar/image.img',
					},
				);

				expect(result).to.be.true;
			});

			it('should return false if the image does not live inside a mount point of the drive', function () {
				const result = constraints.isSourceDrive(
					{
						mountpoints: [
							{
								path: '/Volumes/A',
							},
							{
								path: '/Volumes/B',
							},
						],
					} as DrivelistDrive,
					{
						path: '/Volumes/C/image.img',
					},
				);

				expect(result).to.be.false;
			});

			it('should return false if the image is in a mount point that is a substring of the image mount point', function () {
				const result = constraints.isSourceDrive(
					{
						mountpoints: [
							{
								path: '/Volumes/fo',
							},
						],
					} as DrivelistDrive,
					{
						path: '/Volumes/foo/image.img',
					},
				);

				expect(result).to.be.false;
			});
		});
	});

	describe('.isDriveLargeEnough()', function () {
		beforeEach(function () {
			this.drive = {
				device: '/dev/disk1',
				size: 1000000000,
				isReadOnly: false,
			};
		});

		describe('given the final image size estimation flag is false', function () {
			describe('given the original size is less than the drive size', function () {
				beforeEach(function () {
					this.image = {
						path: path.join(__dirname, 'rpi.img'),
						size: this.drive.size - 1,
						isSizeEstimated: false,
					};
				});

				it('should return true if the final size is less than the drive size', function () {
					expect(constraints.isDriveLargeEnough(this.drive, this.image)).to.be
						.true;
				});

				it('should return true if the final size is equal to the drive size', function () {
					this.image.size = this.drive.size;
					expect(constraints.isDriveLargeEnough(this.drive, this.image)).to.be
						.true;
				});

				it('should return false if the final size is greater than the drive size', function () {
					this.image.size = this.drive.size + 1;
					expect(constraints.isDriveLargeEnough(this.drive, this.image)).to.be
						.false;
				});
			});

			describe('given the original size is equal to the drive size', function () {
				beforeEach(function () {
					this.image = {
						path: path.join(__dirname, 'rpi.img'),
						size: this.drive.size,
						isSizeEstimated: false,
					};
				});

				it('should return true if the final size is less than the drive size', function () {
					this.image.size = this.drive.size - 1;
					expect(constraints.isDriveLargeEnough(this.drive, this.image)).to.be
						.true;
				});

				it('should return true if the final size is equal to the drive size', function () {
					expect(constraints.isDriveLargeEnough(this.drive, this.image)).to.be
						.true;
				});

				it('should return false if the final size is greater than the drive size', function () {
					this.image.size = this.drive.size + 1;
					expect(constraints.isDriveLargeEnough(this.drive, this.image)).to.be
						.false;
				});
			});

			describe('given the original size is greater than the drive size', function () {
				beforeEach(function () {
					this.image = {
						path: path.join(__dirname, 'rpi.img'),
						size: this.drive.size + 1,
						isSizeEstimated: false,
					};
				});

				it('should return true if the final size is less than the drive size', function () {
					this.image.size = this.drive.size - 1;
					expect(constraints.isDriveLargeEnough(this.drive, this.image)).to.be
						.true;
				});

				it('should return true if the final size is equal to the drive size', function () {
					this.image.size = this.drive.size;
					expect(constraints.isDriveLargeEnough(this.drive, this.image)).to.be
						.true;
				});

				it('should return false if the final size is greater than the drive size', function () {
					expect(constraints.isDriveLargeEnough(this.drive, this.image)).to.be
						.false;
				});
			});
		});

		describe('given the final image size estimation flag is true', function () {
			describe('given the original size is less than the drive size', function () {
				beforeEach(function () {
					this.image = {
						path: path.join(__dirname, 'rpi.img'),
						size: this.drive.size - 1,
						compressedSize: this.drive.size - 1,
						isSizeEstimated: true,
					};
				});

				it('should return true if the final size is less than the drive size', function () {
					expect(constraints.isDriveLargeEnough(this.drive, this.image)).to.be
						.true;
				});

				it('should return true if the final size is equal to the drive size', function () {
					this.image.size = this.drive.size;
					expect(constraints.isDriveLargeEnough(this.drive, this.image)).to.be
						.true;
				});

				it('should return true if the final size is greater than the drive size', function () {
					this.image.size = this.drive.size + 1;
					expect(constraints.isDriveLargeEnough(this.drive, this.image)).to.be
						.true;
				});
			});

			describe('given the original size is equal to the drive size', function () {
				beforeEach(function () {
					this.image = {
						path: path.join(__dirname, 'rpi.img'),
						size: this.drive.size,
						compressedSize: this.drive.size,
						isSizeEstimated: true,
					};
				});

				it('should return true if the final size is less than the drive size', function () {
					this.image.size = this.drive.size - 1;
					expect(constraints.isDriveLargeEnough(this.drive, this.image)).to.be
						.true;
				});

				it('should return true if the final size is equal to the drive size', function () {
					expect(constraints.isDriveLargeEnough(this.drive, this.image)).to.be
						.true;
				});

				it('should return true if the final size is greater than the drive size', function () {
					this.image.size = this.drive.size + 1;
					expect(constraints.isDriveLargeEnough(this.drive, this.image)).to.be
						.true;
				});
			});

			describe('given the original size is greater than the drive size', function () {
				beforeEach(function () {
					this.image = {
						path: path.join(__dirname, 'rpi.img'),
						size: this.drive.size + 1,
						compressedSize: this.drive.size + 1,
						isSizeEstimated: true,
					};
				});

				it('should return false if the final size is less than the drive size', function () {
					this.image.size = this.drive.size - 1;
					expect(constraints.isDriveLargeEnough(this.drive, this.image)).to.be
						.false;
				});

				it('should return false if the final size is equal to the drive size', function () {
					this.image.size = this.drive.size;
					expect(constraints.isDriveLargeEnough(this.drive, this.image)).to.be
						.false;
				});

				it('should return false if the final size is greater than the drive size', function () {
					expect(constraints.isDriveLargeEnough(this.drive, this.image)).to.be
						.false;
				});
			});
		});

		it('should return false if the drive is undefined', function () {
			const result = constraints.isDriveLargeEnough(undefined, {
				path: path.join(__dirname, 'rpi.img'),
				size: 1000000000,
				isSizeEstimated: false,
			});

			expect(result).to.be.false;
		});

		it('should return true if the image is undefined', function () {
			const result = constraints.isDriveLargeEnough(
				{
					device: '/dev/disk1',
					size: 1000000000,
					isReadOnly: false,
				} as DrivelistDrive,
				// @ts-ignore
				undefined,
			);

			expect(result).to.be.true;
		});

		it('should return false if the drive and image are undefined', function () {
			// @ts-ignore
			const result = constraints.isDriveLargeEnough(undefined, undefined);
			expect(result).to.be.true;
		});
	});

	describe('.isDriveDisabled()', function () {
		it('should return true if the drive is disabled', function () {
			const result = constraints.isDriveDisabled(({
				device: '/dev/disk1',
				size: 1000000000,
				isReadOnly: false,
				disabled: true,
			} as unknown) as DrivelistDrive);

			expect(result).to.be.true;
		});

		it('should return false if the drive is not disabled', function () {
			const result = constraints.isDriveDisabled(({
				device: '/dev/disk1',
				size: 1000000000,
				isReadOnly: false,
				disabled: false,
			} as unknown) as DrivelistDrive);

			expect(result).to.be.false;
		});

		it('should return false if "disabled" is undefined', function () {
			const result = constraints.isDriveDisabled({
				device: '/dev/disk1',
				size: 1000000000,
				isReadOnly: false,
			} as DrivelistDrive);

			expect(result).to.be.false;
		});
	});

	describe('.isDriveSizeRecommended()', function () {
		it('should return true if the drive size is greater than the recommended size ', function () {
			const result = constraints.isDriveSizeRecommended(
				{
					device: '/dev/disk1',
					size: 2000000001,
					isReadOnly: false,
				} as DrivelistDrive,
				{
					path: path.join(__dirname, 'rpi.img'),
					size: 1000000000,
					isSizeEstimated: false,
					recommendedDriveSize: 2000000000,
				},
			);

			expect(result).to.be.true;
		});

		it('should return true if the drive size is equal to recommended size', function () {
			const result = constraints.isDriveSizeRecommended(
				{
					device: '/dev/disk1',
					size: 2000000000,
					isReadOnly: false,
				} as DrivelistDrive,
				{
					path: path.join(__dirname, 'rpi.img'),
					size: 1000000000,
					isSizeEstimated: false,
					recommendedDriveSize: 2000000000,
				},
			);

			expect(result).to.be.true;
		});

		it('should return false if the drive size is less than the recommended size', function () {
			const result = constraints.isDriveSizeRecommended(
				{
					device: '/dev/disk1',
					size: 2000000000,
					isReadOnly: false,
				} as DrivelistDrive,
				{
					path: path.join(__dirname, 'rpi.img'),
					size: 1000000000,
					isSizeEstimated: false,
					recommendedDriveSize: 2000000001,
				},
			);

			expect(result).to.be.false;
		});

		it('should return true if the recommended drive size is undefined', function () {
			const result = constraints.isDriveSizeRecommended(
				{
					device: '/dev/disk1',
					size: 2000000000,
					isReadOnly: false,
				} as DrivelistDrive,
				{
					path: path.join(__dirname, 'rpi.img'),
					size: 1000000000,
					isSizeEstimated: false,
				},
			);

			expect(result).to.be.true;
		});

		it('should return false if the drive is undefined', function () {
			const result = constraints.isDriveSizeRecommended(undefined, {
				path: path.join(__dirname, 'rpi.img'),
				size: 1000000000,
				isSizeEstimated: false,
				recommendedDriveSize: 1000000000,
			});

			expect(result).to.be.false;
		});

		it('should return true if the image is undefined', function () {
			const result = constraints.isDriveSizeRecommended(
				{
					device: '/dev/disk1',
					size: 2000000000,
					isReadOnly: false,
				} as DrivelistDrive,
				// @ts-ignore
				undefined,
			);

			expect(result).to.be.true;
		});

		it('should return false if the drive and image are undefined', function () {
			// @ts-ignore
			const result = constraints.isDriveSizeRecommended(undefined, undefined);
			expect(result).to.be.true;
		});
	});

	describe('.isDriveValid()', function () {
		beforeEach(function () {
			if (process.platform === 'win32') {
				this.mountpoint = 'E:\\foo';
			} else {
				this.mountpoint = '/mnt/foo';
			}

			this.drive = {
				device: '/dev/disk2',
				mountpoints: [
					{
						path: this.mountpoint,
					},
				],
				size: 4000000000,
			};
		});

		describe('given the drive is locked', function () {
			beforeEach(function () {
				this.drive.isReadOnly = true;
			});

			describe('given the drive is disabled', function () {
				beforeEach(function () {
					this.drive.disabled = true;
				});

				it('should return false if the drive is not large enough and is a source drive', function () {
					expect(
						constraints.isDriveValid(this.drive, {
							path: path.join(this.mountpoint, 'rpi.img'),
							size: 5000000000,
							isSizeEstimated: false,
						}),
					).to.be.false;
				});

				it('should return false if the drive is not large enough and is not a source drive', function () {
					expect(
						constraints.isDriveValid(this.drive, {
							path: path.resolve(this.mountpoint, '../bar/rpi.img'),
							size: 5000000000,
							isSizeEstimated: false,
						}),
					).to.be.false;
				});

				it('should return false if the drive is large enough and is a source drive', function () {
					expect(
						constraints.isDriveValid(this.drive, {
							path: path.join(this.mountpoint, 'rpi.img'),
							size: 2000000000,
							isSizeEstimated: false,
						}),
					).to.be.false;
				});

				it('should return false if the drive is large enough and is not a source drive', function () {
					expect(
						constraints.isDriveValid(this.drive, {
							path: path.resolve(this.mountpoint, '../bar/rpi.img'),
							size: 2000000000,
							isSizeEstimated: false,
						}),
					).to.be.false;
				});
			});

			describe('given the drive is not disabled', function () {
				beforeEach(function () {
					this.drive.disabled = false;
				});

				it('should return false if the drive is not large enough and is a source drive', function () {
					expect(
						constraints.isDriveValid(this.drive, {
							path: path.join(this.mountpoint, 'rpi.img'),
							size: 5000000000,
							isSizeEstimated: false,
						}),
					).to.be.false;
				});

				it('should return false if the drive is not large enough and is not a source drive', function () {
					expect(
						constraints.isDriveValid(this.drive, {
							path: path.resolve(this.mountpoint, '../bar/rpi.img'),
							size: 5000000000,
							isSizeEstimated: false,
						}),
					).to.be.false;
				});

				it('should return false if the drive is large enough and is a source drive', function () {
					expect(
						constraints.isDriveValid(this.drive, {
							path: path.join(this.mountpoint, 'rpi.img'),
							size: 2000000000,
							isSizeEstimated: false,
						}),
					).to.be.false;
				});

				it('should return false if the drive is large enough and is not a source drive', function () {
					expect(
						constraints.isDriveValid(this.drive, {
							path: path.resolve(this.mountpoint, '../bar/rpi.img'),
							size: 2000000000,
							isSizeEstimated: false,
						}),
					).to.be.false;
				});
			});
		});

		describe('given the drive is not locked', function () {
			beforeEach(function () {
				this.drive.isReadOnly = false;
			});

			describe('given the drive is disabled', function () {
				beforeEach(function () {
					this.drive.disabled = true;
				});

				it('should return false if the drive is not large enough and is a source drive', function () {
					expect(
						constraints.isDriveValid(this.drive, {
							path: path.join(this.mountpoint, 'rpi.img'),
							size: 5000000000,
							isSizeEstimated: false,
						}),
					).to.be.false;
				});

				it('should return false if the drive is not large enough and is not a source drive', function () {
					expect(
						constraints.isDriveValid(this.drive, {
							path: path.resolve(this.mountpoint, '../bar/rpi.img'),
							size: 5000000000,
							isSizeEstimated: false,
						}),
					).to.be.false;
				});

				it('should return false if the drive is large enough and is a source drive', function () {
					expect(
						constraints.isDriveValid(this.drive, {
							path: path.join(this.mountpoint, 'rpi.img'),
							size: 2000000000,
							isSizeEstimated: false,
						}),
					).to.be.false;
				});

				it('should return false if the drive is large enough and is not a source drive', function () {
					expect(
						constraints.isDriveValid(this.drive, {
							path: path.resolve(this.mountpoint, '../bar/rpi.img'),
							size: 2000000000,
							isSizeEstimated: false,
						}),
					).to.be.false;
				});
			});

			describe('given the drive is not disabled', function () {
				beforeEach(function () {
					this.drive.disabled = false;
				});

				it('should return false if the drive is not large enough and is a source drive', function () {
					expect(
						constraints.isDriveValid(this.drive, {
							path: path.join(this.mountpoint, 'rpi.img'),
							size: 5000000000,
							isSizeEstimated: false,
						}),
					).to.be.false;
				});

				it('should return false if the drive is not large enough and is not a source drive', function () {
					expect(
						constraints.isDriveValid(this.drive, {
							path: path.resolve(this.mountpoint, '../bar/rpi.img'),
							size: 5000000000,
							isSizeEstimated: false,
						}),
					).to.be.false;
				});

				it('should return false if the drive is large enough and is a source drive', function () {
					expect(
						constraints.isDriveValid(this.drive, {
							path: path.join(this.mountpoint, 'rpi.img'),
							size: 2000000000,
							isSizeEstimated: false,
						}),
					).to.be.false;
				});

				it('should return true if the drive is large enough and is not a source drive', function () {
					expect(
						constraints.isDriveValid(this.drive, {
							path: path.resolve(this.mountpoint, '../bar/rpi.img'),
							size: 2000000000,
							isSizeEstimated: false,
						}),
					).to.be.true;
				});
			});
		});
	});

	describe('.isDriveSizeLarge()', function () {
		beforeEach(function () {
			this.drive = {
				device: '/dev/disk2',
				isReadonly: false,
				isSystem: false,
				disabled: false,
				mountpoints: [
					{
						path: this.mountpoint,
					},
				],
				size: constraints.LARGE_DRIVE_SIZE + 1,
			};

			this.image = {
				path: path.join(__dirname, 'rpi.img'),
				size: this.drive.size - 1,
				isSizeEstimated: false,
			};
		});

		describe('given a drive bigger than the unusually large drive size', function () {
			it('should return true', function () {
				expect(constraints.isDriveSizeLarge(this.drive)).to.be.true;
			});
		});

		describe('given a drive smaller than the unusually large drive size', function () {
			it('should return false', function () {
				this.drive.size = constraints.LARGE_DRIVE_SIZE - 1;
				expect(constraints.isDriveSizeLarge(this.drive)).to.be.false;
			});
		});
	});

	describe('.getDriveImageCompatibilityStatuses', function () {
		beforeEach(function () {
			if (process.platform === 'win32') {
				this.mountpoint = 'E:';
				this.separator = '\\';
			} else {
				this.mountpoint = '/mnt/foo';
				this.separator = '/';
			}

			this.drive = {
				device: '/dev/disk2',
				isReadOnly: false,
				isSystem: false,
				disabled: false,
				mountpoints: [
					{
						path: this.mountpoint,
					},
				],
				size: 4000000000,
			};

			this.image = {
				path: path.join(__dirname, 'rpi.img'),
				size: this.drive.size - 1,
				isSizeEstimated: false,
			};
		});

		const expectStatusTypesAndMessagesToBe = (
			resultList: Array<{ message: string }>,
			expectedTuples: Array<['WARNING' | 'ERROR', string]>,
		) => {
			// Sort so that order doesn't matter
			const expectedTuplesSorted = _.sortBy(
				_.map(expectedTuples, (tuple) => {
					return {
						type: constraints.COMPATIBILITY_STATUS_TYPES[tuple[0]],
						// @ts-ignore
						message: messages.compatibility[tuple[1]](),
					};
				}),
				['message'],
			);
			const resultTuplesSorted = _.sortBy(resultList, ['message']);

			expect(resultTuplesSorted).to.deep.equal(expectedTuplesSorted);
		};

		describe('given there are no errors or warnings', () => {
			it('should return an empty list', function () {
				const result = constraints.getDriveImageCompatibilityStatuses(
					this.drive,
					this.image,
				);

				expect(result).to.deep.equal([]);
			});
		});

		describe('given the drive is disabled', () => {
			it('should return an empty list', function () {
				this.drive.disabled = true;
				const result = constraints.getDriveImageCompatibilityStatuses(
					this.drive,
					this.image,
				);

				const expectedTuples: Array<['WARNING' | 'ERROR', string]> = [];
				expectStatusTypesAndMessagesToBe(result, expectedTuples);
			});
		});

		describe('given the drive contains the image', () => {
			it('should return the contains-image error', function () {
				this.image.path = path.join(this.mountpoint, 'rpi.img');

				const result = constraints.getDriveImageCompatibilityStatuses(
					this.drive,
					this.image,
				);
				// @ts-ignore
				const expectedTuples = [['ERROR', 'containsImage']];

				// @ts-ignore
				expectStatusTypesAndMessagesToBe(result, expectedTuples);
			});
		});

		describe('given the drive is a system drive', () => {
			it('should return the system drive warning', function () {
				this.drive.isSystem = true;

				const result = constraints.getDriveImageCompatibilityStatuses(
					this.drive,
					this.image,
				);
				const expectedTuples = [['WARNING', 'system']];

				// @ts-ignore
				expectStatusTypesAndMessagesToBe(result, expectedTuples);
			});
		});

		describe('given the drive is too small', () => {
			it('should return the too small error', function () {
				this.image.size = this.drive.size + 1;

				const result = constraints.getDriveImageCompatibilityStatuses(
					this.drive,
					this.image,
				);
				const expected = [
					{
						message: messages.compatibility.tooSmall('1 B'),
						type: constraints.COMPATIBILITY_STATUS_TYPES.ERROR,
					},
				];

				expect(result).to.deep.equal(expected);
			});
		});

		describe('given the drive size is null', () => {
			it('should not return the too small error', function () {
				this.image.size = this.drive.size + 1;
				this.drive.size = null;

				const result = constraints.getDriveImageCompatibilityStatuses(
					this.drive,
					this.image,
				);
				// @ts-ignore
				const expectedTuples = [];

				// @ts-ignore
				expectStatusTypesAndMessagesToBe(result, expectedTuples);
			});
		});

		describe('given the drive is locked', () => {
			it('should return the locked drive error', function () {
				this.drive.isReadOnly = true;

				const result = constraints.getDriveImageCompatibilityStatuses(
					this.drive,
					this.image,
				);
				// @ts-ignore
				const expectedTuples = [['ERROR', 'locked']];

				// @ts-ignore
				expectStatusTypesAndMessagesToBe(result, expectedTuples);
			});
		});

		describe('given the drive is smaller than the recommended size', () => {
			it('should return the smaller than recommended size warning', function () {
				this.image.recommendedDriveSize = this.drive.size + 1;

				const result = constraints.getDriveImageCompatibilityStatuses(
					this.drive,
					this.image,
				);
				// @ts-ignore
				const expectedTuples = [['WARNING', 'sizeNotRecommended']];

				// @ts-ignore
				expectStatusTypesAndMessagesToBe(result, expectedTuples);
			});
		});

		describe('given the drive is unusually large', function () {
			it('should return the large drive size warning', function () {
				this.drive.size = constraints.LARGE_DRIVE_SIZE + 1;

				const result = constraints.getDriveImageCompatibilityStatuses(
					this.drive,
					this.image,
				);
				// @ts-ignore
				const expectedTuples = [['WARNING', 'largeDrive']];

				// @ts-ignore
				expectStatusTypesAndMessagesToBe(result, expectedTuples);
			});
		});

		describe('given the drive contains the image and the drive is locked', () => {
			it('should return the locked error by precedence', function () {
				this.drive.isReadOnly = true;
				this.image.path = path.join(this.mountpoint, 'rpi.img');

				const result = constraints.getDriveImageCompatibilityStatuses(
					this.drive,
					this.image,
				);
				// @ts-ignore
				const expectedTuples = [['ERROR', 'locked']];

				// @ts-ignore
				expectStatusTypesAndMessagesToBe(result, expectedTuples);
			});
		});

		describe('given a locked and too small drive', () => {
			it('should return the locked error by precedence', function () {
				this.drive.isReadOnly = true;

				const result = constraints.getDriveImageCompatibilityStatuses(
					this.drive,
					this.image,
				);
				// @ts-ignore
				const expectedTuples = [['ERROR', 'locked']];

				// @ts-ignore
				expectStatusTypesAndMessagesToBe(result, expectedTuples);
			});
		});

		describe('given a too small and system drive', () => {
			it('should return the too small drive error by precedence', function () {
				this.image.size = this.drive.size + 1;
				this.drive.isSystem = true;

				const result = constraints.getDriveImageCompatibilityStatuses(
					this.drive,
					this.image,
				);
				const expected = [
					{
						message: messages.compatibility.tooSmall('1 B'),
						type: constraints.COMPATIBILITY_STATUS_TYPES.ERROR,
					},
				];

				expect(result).to.deep.equal(expected);
			});
		});

		describe('given a system drive and not recommended drive size', () => {
			it('should return both warnings', function () {
				this.drive.isSystem = true;
				this.image.recommendedDriveSize = this.drive.size + 1;

				const result = constraints.getDriveImageCompatibilityStatuses(
					this.drive,
					this.image,
				);
				// @ts-ignore
				const expectedTuples = [
					['WARNING', 'sizeNotRecommended'],
					['WARNING', 'system'],
				];

				// @ts-ignore
				expectStatusTypesAndMessagesToBe(result, expectedTuples);
			});
		});
	});

	describe('.getListDriveImageCompatibilityStatuses()', function () {
		const drivePaths =
			process.platform === 'win32'
				? ['E:\\', 'F:\\', 'G:\\', 'H:\\', 'J:\\', 'K:\\']
				: [
						'/dev/disk1',
						'/dev/disk2',
						'/dev/disk3',
						'/dev/disk4',
						'/dev/disk5',
						'/dev/disk6',
				  ];
		const drives = [
			({
				device: drivePaths[0],
				description: 'My Drive',
				size: 123456789,
				displayName: drivePaths[0],
				mountpoints: [{ path: __dirname }],
				isSystem: false,
				isReadOnly: false,
			} as unknown) as DrivelistDrive,
			({
				device: drivePaths[1],
				description: 'My Other Drive',
				size: 123456789,
				displayName: drivePaths[1],
				mountpoints: [],
				isSystem: false,
				isReadOnly: true,
			} as unknown) as DrivelistDrive,
			({
				device: drivePaths[2],
				description: 'My Drive',
				size: 1234567,
				displayName: drivePaths[2],
				mountpoints: [],
				isSystem: false,
				isReadOnly: false,
			} as unknown) as DrivelistDrive,
			({
				device: drivePaths[3],
				description: 'My Drive',
				size: 123456789,
				displayName: drivePaths[3],
				mountpoints: [],
				isSystem: true,
				isReadOnly: false,
			} as unknown) as DrivelistDrive,
			({
				device: drivePaths[4],
				description: 'My Drive',
				size: 64000000001,
				displayName: drivePaths[4],
				mountpoints: [],
				isSystem: false,
				isReadOnly: false,
			} as unknown) as DrivelistDrive,
			({
				device: drivePaths[5],
				description: 'My Drive',
				size: 12345678,
				displayName: drivePaths[5],
				mountpoints: [],
				isSystem: false,
				isReadOnly: false,
			} as unknown) as DrivelistDrive,
			({
				device: drivePaths[6],
				description: 'My Drive',
				size: 123456789,
				displayName: drivePaths[6],
				mountpoints: [],
				isSystem: false,
				isReadOnly: false,
			} as unknown) as DrivelistDrive,
		];

		const image = {
			path: path.join(__dirname, 'rpi.img'),
			// @ts-ignore
			size: drives[2].size + 1,
			isSizeEstimated: false,
			// @ts-ignore
			recommendedDriveSize: drives[5].size + 1,
		};

		describe('given no drives', function () {
			it('should return no statuses', function () {
				expect(
					constraints.getListDriveImageCompatibilityStatuses([], image),
				).to.deep.equal([]);
			});
		});

		describe('given one drive', function () {
			it('should return contains image error', function () {
				expect(
					constraints.getListDriveImageCompatibilityStatuses(
						[drives[0]],
						image,
					),
				).to.deep.equal([
					{
						message: 'Source drive',
						type: 2,
					},
				]);
			});

			it('should return locked error', function () {
				expect(
					constraints.getListDriveImageCompatibilityStatuses(
						[drives[1]],
						image,
					),
				).to.deep.equal([
					{
						message: 'Locked',
						type: 2,
					},
				]);
			});

			it('should return too small for image error', function () {
				expect(
					constraints.getListDriveImageCompatibilityStatuses(
						[drives[2]],
						image,
					),
				).to.deep.equal([
					{
						message: 'Insufficient space, additional 1 B required',
						type: 2,
					},
				]);
			});

			it('should return system drive warning', function () {
				expect(
					constraints.getListDriveImageCompatibilityStatuses(
						[drives[3]],
						image,
					),
				).to.deep.equal([
					{
						message: 'System drive',
						type: 1,
					},
				]);
			});

			it('should return large drive warning', function () {
				expect(
					constraints.getListDriveImageCompatibilityStatuses(
						[drives[4]],
						image,
					),
				).to.deep.equal([
					{
						message: 'Large drive',
						type: 1,
					},
				]);
			});

			it('should return not recommended warning', function () {
				expect(
					constraints.getListDriveImageCompatibilityStatuses(
						[drives[5]],
						image,
					),
				).to.deep.equal([
					{
						message: 'Not Recommended',
						type: 1,
					},
				]);
			});
		});

		describe('given multiple drives with all warnings/errors', function () {
			it('should return all statuses', function () {
				expect(
					constraints.getListDriveImageCompatibilityStatuses(drives, image),
				).to.deep.equal([
					{
						message: 'Source drive',
						type: 2,
					},
					{
						message: 'Locked',
						type: 2,
					},
					{
						message: 'Insufficient space, additional 1 B required',
						type: 2,
					},
					{
						message: 'System drive',
						type: 1,
					},
					{
						message: 'Large drive',
						type: 1,
					},
					{
						message: 'Not Recommended',
						type: 1,
					},
				]);
			});
		});
	});

	describe('.hasListDriveImageCompatibilityStatus()', function () {
		const drivePaths =
			process.platform === 'win32'
				? ['E:\\', 'F:\\', 'G:\\', 'H:\\', 'J:\\', 'K:\\']
				: [
						'/dev/disk1',
						'/dev/disk2',
						'/dev/disk3',
						'/dev/disk4',
						'/dev/disk5',
						'/dev/disk6',
				  ];
		const drives = [
			({
				device: drivePaths[0],
				description: 'My Drive',
				size: 123456789,
				displayName: drivePaths[0],
				mountpoints: [{ path: __dirname }],
				isSystem: false,
				isReadOnly: false,
			} as unknown) as DrivelistDrive,
			({
				device: drivePaths[1],
				description: 'My Other Drive',
				size: 123456789,
				displayName: drivePaths[1],
				mountpoints: [],
				isSystem: false,
				isReadOnly: true,
			} as unknown) as DrivelistDrive,
			({
				device: drivePaths[2],
				description: 'My Drive',
				size: 1234567,
				displayName: drivePaths[2],
				mountpoints: [],
				isSystem: false,
				isReadOnly: false,
			} as unknown) as DrivelistDrive,
			({
				device: drivePaths[3],
				description: 'My Drive',
				size: 123456789,
				displayName: drivePaths[3],
				mountpoints: [],
				isSystem: true,
				isReadOnly: false,
			} as unknown) as DrivelistDrive,
			({
				device: drivePaths[4],
				description: 'My Drive',
				size: 64000000001,
				displayName: drivePaths[4],
				mountpoints: [],
				isSystem: false,
				isReadOnly: false,
			} as unknown) as DrivelistDrive,
			({
				device: drivePaths[5],
				description: 'My Drive',
				size: 12345678,
				displayName: drivePaths[5],
				mountpoints: [],
				isSystem: false,
				isReadOnly: false,
			} as unknown) as DrivelistDrive,
			({
				device: drivePaths[6],
				description: 'My Drive',
				size: 123456789,
				displayName: drivePaths[6],
				mountpoints: [],
				isSystem: false,
				isReadOnly: false,
			} as unknown) as DrivelistDrive,
		];

		const image = {
			path: path.join(__dirname, 'rpi.img'),
			// @ts-ignore
			size: drives[2].size + 1,
			isSizeEstimated: false,
			// @ts-ignore
			recommendedDriveSize: drives[5].size + 1,
		};

		describe('given no drives', function () {
			it('should return false', function () {
				expect(constraints.hasListDriveImageCompatibilityStatus([], image)).to
					.be.false;
			});
		});

		describe('given one drive', function () {
			it('should return true given a drive that contains the image', function () {
				expect(
					constraints.hasListDriveImageCompatibilityStatus([drives[0]], image),
				).to.be.true;
			});

			it('should return true given a drive that is locked', function () {
				expect(
					constraints.hasListDriveImageCompatibilityStatus([drives[1]], image),
				).to.be.true;
			});

			it('should return true given a drive that is too small for the image', function () {
				expect(
					constraints.hasListDriveImageCompatibilityStatus([drives[2]], image),
				).to.be.true;
			});

			it('should return true given a drive that is a system drive', function () {
				expect(
					constraints.hasListDriveImageCompatibilityStatus([drives[3]], image),
				).to.be.true;
			});

			it('should return true given a drive that is large', function () {
				expect(
					constraints.hasListDriveImageCompatibilityStatus([drives[4]], image),
				).to.be.true;
			});

			it('should return true given a drive that is not recommended', function () {
				expect(
					constraints.hasListDriveImageCompatibilityStatus([drives[5]], image),
				).to.be.true;
			});

			it('should return false given a drive with no warnings or errors', function () {
				expect(
					constraints.hasListDriveImageCompatibilityStatus([drives[6]], image),
				).to.be.false;
			});
		});

		describe('given many drives', function () {
			it('should return true given some drives with errors or warnings', function () {
				expect(constraints.hasListDriveImageCompatibilityStatus(drives, image))
					.to.be.true;
			});
		});
	});
});
